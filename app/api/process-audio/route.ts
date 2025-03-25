import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { z } from "zod";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { Readable } from "stream";

// Zod schema for validating the parsed data
const PostSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  location: z.string().min(1, "Location is required"),
  category: z.string().min(1, "Category is required"),
  author: z.string().min(1, "Author is required"),
  type: z.enum(["Offer", "Request"])
});

// Define custom error types
interface CustomError {
  type: string;
  message: string;
  fields?: string[];
  details?: any;
}

// Error types for client-side handling
const ErrorTypes = {
  INSUFFICIENT_INFO: "INSUFFICIENT_INFO",
  INVALID_FORMAT: "INVALID_FORMAT",
  SERVER_ERROR: "SERVER_ERROR",
  API_ERROR: "API_ERROR",
};

// Helper function to convert a Buffer to a Readable stream
function bufferToStream(buffer: Buffer): Readable {
  const readable = new Readable();
  readable.push(buffer);
  readable.push(null);
  return readable;
}

// Helper function to process transcription with retries
async function processTranscriptionWithRetries(
  groq: Groq,
  transcription: string,
  postType: 'Offer' | 'Request',
  maxRetries = 3
): Promise<z.infer<typeof PostSchema>> {
  let lastError: CustomError | Error | unknown = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // Track timing for each attempt
    const attemptStartTime = performance.now();
    console.log(`[LLM Processing] Attempt ${attempt}/${maxRetries} started`);
    
    try {
      // Process the transcription to extract structured data
      const processingResponse = await groq.chat.completions.create({
        model: "llama3-8b-8192",
        messages: [
          {
            role: "system",
            content: `You are a helpful assistant that extracts structured data from text. 
            Parse the user's input and extract the following fields for a community ${postType.toLowerCase()} posting:
            - title: A concise title for the ${postType.toLowerCase()} (required)
            - description: A detailed description of ${postType === 'Offer' ? 'what is being offered' : 'what is being requested'} (optional)
            - location: The location (default to "Boston" if not specified)
            - category: The category of the ${postType.toLowerCase()} (e.g., Education, Services, etc.)
            - author: The name of the person making the ${postType.toLowerCase()} (use "Anonymous" if not specified)
            
            IMPORTANT: If the input does not contain explicit information about some fields:
            1. For description: leave it as an empty string if not provided
            2. For category: intelligently infer a suitable category based on the overall content
            3. For other fields: use reasonable default values
            
            Only include a field in the "missing_fields" array if it's a required field (title, location, author) AND 
            there is absolutely no way to infer it from the context.
            
            Format your response as valid JSON with these exact fields plus an additional "missing_fields" array.`
          },
          {
            role: "user",
            content: transcription
          }
        ],
        response_format: { type: "json_object" }
      });

      // Track timing for response
      const responseTime = ((performance.now() - attemptStartTime) / 1000).toFixed(2);
      console.log(`[LLM Processing] Attempt ${attempt} completed in ${responseTime}s`);

      // Parse the JSON response from the LLM
      const responseContent = processingResponse.choices[0].message.content || '{}';
      console.log(`[LLM Response] Raw response: ${responseContent.substring(0, 200)}${responseContent.length > 200 ? '...' : ''}`);
      
      const parsedData = JSON.parse(responseContent);
      
      // Check if crucial fields are missing
      if (parsedData.missing_fields && parsedData.missing_fields.length > 0) {
        console.log(`[LLM Processing] Missing fields detected: ${parsedData.missing_fields.join(', ')}`);
        throw {
          type: ErrorTypes.INSUFFICIENT_INFO,
          message: 'Not enough information provided in the audio',
          fields: parsedData.missing_fields
        } as CustomError;
      }
      
      // Validate with Zod schema
      const { missing_fields, ...dataToValidate } = parsedData;
      
      // Set empty description to undefined so it doesn't fail validation
      if (dataToValidate.description === '') {
        dataToValidate.description = undefined;
      }
      
      // Add the type field
      dataToValidate.type = postType;
      
      console.log(`[LLM Processing] Successfully extracted structured data on attempt ${attempt}`);
      return PostSchema.parse(dataToValidate);
    } catch (error) {
      lastError = error;
      
      // If it's an insufficient info error, don't retry
      if (typeof error === 'object' && error !== null && 'type' in error && 
          (error as CustomError).type === ErrorTypes.INSUFFICIENT_INFO) {
        console.log(`[LLM Processing] Insufficient information error, not retrying`);
        throw error;
      }
      
      // For other errors, log and continue trying
      const errorTime = ((performance.now() - attemptStartTime) / 1000).toFixed(2);
      console.error(`[LLM Processing] Attempt ${attempt} failed after ${errorTime}s:`, error);
      
      // Throw error if it's the last attempt
      if (attempt === maxRetries) {
        console.log(`[LLM Processing] All ${maxRetries} attempts failed`);
        if (error instanceof z.ZodError) {
          throw {
            type: ErrorTypes.INVALID_FORMAT,
            message: 'The extracted data does not match the required format',
            details: error.errors
          } as CustomError;
        }
        throw error;
      }
    }
  }
  
  // Should never reach here, but TypeScript requires a return
  throw lastError;
}

export async function POST(request: NextRequest) {
  let tempFilePath = '';
  
  // Add performance tracking variables
  const apiStartTime = performance.now();
  let transcriptionStartTime = 0;
  let transcriptionEndTime = 0;
  let llmStartTime = 0;
  let llmEndTime = 0;
  let transcriptionText = '';
  
  try {
    // Initialize Groq client with server-side API key
    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });

    // Check if Groq API key is available
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { 
          error: 'Groq API key is not configured on the server',
          type: ErrorTypes.SERVER_ERROR 
        },
        { status: 500 }
      );
    }

    // Parse the FormData from the request
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const postType = formData.get('type') as string || 'Offer';  // Default to Offer if not specified

    // Validate post type
    if (postType !== 'Offer' && postType !== 'Request') {
      return NextResponse.json(
        { 
          error: 'Invalid post type. Must be "Offer" or "Request"',
          type: ErrorTypes.SERVER_ERROR
        },
        { status: 400 }
      );
    }

    if (!audioFile) {
      return NextResponse.json(
        { 
          error: 'No audio file provided',
          type: ErrorTypes.SERVER_ERROR
        },
        { status: 400 }
      );
    }

    // Save audio file to temp directory
    const tempDir = os.tmpdir();
    tempFilePath = path.join(tempDir, `recording-${Date.now()}.wav`);
    
    const audioBuffer = await audioFile.arrayBuffer();
    await fs.writeFile(tempFilePath, Buffer.from(audioBuffer));

    try {
      // Mark the start of transcription
      transcriptionStartTime = performance.now();
      
      // Use fetch directly to call Groq's API for audio transcription
      const formData = new FormData();
      const fileContent = await fs.readFile(tempFilePath);
      const fileBlob = new Blob([fileContent], { type: 'audio/wav' });
      formData.append('file', fileBlob, 'audio.wav');
      formData.append('model', 'distil-whisper-large-v3-en');
      formData.append('response_format', 'text');

      // Log which model we're using
      console.log(`[Audio Transcription] Using model: distil-whisper-large-v3-en (English-only, faster processing)`);

      const transcriptionResponse = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: formData,
      });

      if (!transcriptionResponse.ok) {
        throw {
          type: ErrorTypes.API_ERROR,
          message: `Transcription failed with status: ${transcriptionResponse.status}`
        } as CustomError;
      }

      // Get the text response directly instead of treating it as JSON
      transcriptionText = await transcriptionResponse.text();
      
      // Record end of transcription time
      transcriptionEndTime = performance.now();
      
      if (!transcriptionText || transcriptionText.trim() === '') {
        return NextResponse.json(
          { 
            error: 'No speech detected in the audio',
            type: ErrorTypes.INSUFFICIENT_INFO
          },
          { status: 422 }
        );
      }

      // Log the transcript
      console.log(`[Audio Transcript]: "${transcriptionText}"`);
      
      // Mark the start of LLM processing
      llmStartTime = performance.now();
      
      // Process transcription with retries
      const validatedData = await processTranscriptionWithRetries(
        groq, 
        transcriptionText, 
        postType as 'Offer' | 'Request'
      );
      
      // Record end of LLM processing time
      llmEndTime = performance.now();
      
      // Calculate and log performance metrics
      const transcriptionTime = ((transcriptionEndTime - transcriptionStartTime) / 1000).toFixed(2);
      const llmProcessingTime = ((llmEndTime - llmStartTime) / 1000).toFixed(2);
      const totalTime = ((performance.now() - apiStartTime) / 1000).toFixed(2);
      
      console.log(`[Performance Metrics] Post Type: ${postType}`);
      console.log(`- Audio Transcription: ${transcriptionTime}s`);
      console.log(`- LLM Processing: ${llmProcessingTime}s`);
      console.log(`- Total API Time: ${totalTime}s`);

      // Return the processed and validated data
      return NextResponse.json(validatedData);
    } catch (error: unknown) {
      console.error('Error processing with Groq API:', error);
      
      // Log performance metrics even on error
      if (transcriptionEndTime > 0) {
        const transcriptionTime = ((transcriptionEndTime - transcriptionStartTime) / 1000).toFixed(2);
        console.log(`[Performance Metrics - Error Path]`);
        console.log(`- Audio Transcription: ${transcriptionTime}s`);
        if (transcriptionText) {
          console.log(`[Audio Transcript]: "${transcriptionText}"`);
        }
      }
      
      // Handle specific error types
      if (typeof error === 'object' && error !== null) {
        const customError = error as Partial<CustomError>;
        
        if (customError.type === ErrorTypes.INSUFFICIENT_INFO) {
          return NextResponse.json(
            { 
              error: customError.message,
              type: customError.type,
              missingFields: customError.fields
            },
            { status: 422 }
          );
        } else if (customError.type === ErrorTypes.INVALID_FORMAT) {
          return NextResponse.json(
            { 
              error: customError.message,
              type: customError.type,
              details: customError.details
            },
            { status: 422 }
          );
        } else if (customError.type === ErrorTypes.API_ERROR) {
          return NextResponse.json(
            { 
              error: customError.message,
              type: customError.type 
            },
            { status: 500 }
          );
        }
      }
      
      // Generic error handling
      return NextResponse.json(
        { 
          error: 'Failed to process audio with Groq API',
          type: ErrorTypes.SERVER_ERROR
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in process-audio API:', error);
    return NextResponse.json(
      { 
        error: 'An error occurred while processing the audio',
        type: ErrorTypes.SERVER_ERROR
      },
      { status: 500 }
    );
  } finally {
    // Clean up temp file if it exists
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
      } catch (unlinkError) {
        console.error('Error deleting temp file:', unlinkError);
      }
    }
  }
}
