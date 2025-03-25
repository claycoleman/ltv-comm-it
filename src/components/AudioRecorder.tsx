import React, { useState, useRef, useEffect } from "react";
import { useAudio } from "react-use";
import { Mic, Square, Loader2, AlertCircle, Info, MicOff } from "lucide-react";

interface AudioRecorderProps {
  onAudioProcessed: (data: Record<string, any>) => void;
  postType: 'Offer' | 'Request';
}

// Define error types matching the backend
enum ErrorType {
  INSUFFICIENT_INFO = "INSUFFICIENT_INFO",
  INVALID_FORMAT = "INVALID_FORMAT",
  SERVER_ERROR = "SERVER_ERROR",
  API_ERROR = "API_ERROR",
  MIC_PERMISSION = "MIC_PERMISSION",
  BROWSER_SUPPORT = "BROWSER_SUPPORT",
}

interface ApiError {
  error: string;
  type: ErrorType;
  missingFields?: string[];
  details?: any;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onAudioProcessed,
  postType = 'Offer'
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [microphoneAvailable, setMicrophoneAvailable] = useState<
    boolean | null
  >(null);
  const [filledFields, setFilledFields] = useState<string[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Check if browser supports MediaRecorder API
  useEffect(() => {
    const checkBrowserSupport = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setMicrophoneAvailable(false);
        setError({
          error:
            "Your browser doesn't support audio recording. Please try a modern browser like Chrome, Firefox, or Safari.",
          type: ErrorType.BROWSER_SUPPORT,
        });
        return;
      }

      try {
        // Just check if we can access the microphone
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        // If we get here, we have access - stop all tracks
        stream.getTracks().forEach((track) => track.stop());
        setMicrophoneAvailable(true);
      } catch (err) {
        console.error("Microphone check failed:", err);
        setMicrophoneAvailable(false);
        if (
          (err as Error).name === "NotAllowedError" ||
          (err as Error).name === "PermissionDeniedError"
        ) {
          setError({
            error:
              "Microphone access was denied. Please allow microphone access in your browser settings.",
            type: ErrorType.MIC_PERMISSION,
          });
        } else {
          setError({
            error:
              "Unable to access your microphone. Please check your device settings.",
            type: ErrorType.MIC_PERMISSION,
          });
        }
      }
    };

    checkBrowserSupport();
  }, []);

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/wav" });
        await processAudio(audioBlob);

        // Stop all tracks to release the microphone
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        setError({
          error: "An error occurred while recording. Please try again.",
          type: ErrorType.SERVER_ERROR,
        });
        // Stop all tracks to release the microphone
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      if (
        (err as Error).name === "NotAllowedError" ||
        (err as Error).name === "PermissionDeniedError"
      ) {
        setError({
          error:
            "Microphone access was denied. Please allow microphone access in your browser settings.",
          type: ErrorType.MIC_PERMISSION,
        });
      } else {
        setError({
          error:
            "Could not access microphone. Please ensure your device has a working microphone.",
          type: ErrorType.SERVER_ERROR,
        });
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.error("Error stopping recording:", err);
      }
      setIsRecording(false);
    }
  };

  const requestMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // If we get here, we have access - stop all tracks
      stream.getTracks().forEach((track) => track.stop());
      setMicrophoneAvailable(true);
      setError(null);
    } catch (err) {
      console.error("Microphone permission request failed:", err);
      setMicrophoneAvailable(false);
      setError({
        error:
          "Microphone access was denied. Please allow microphone access in your browser settings.",
        type: ErrorType.MIC_PERMISSION,
      });
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.wav");
      formData.append("type", postType); // Add post type to the form data

      const response = await fetch("/api/process-audio", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data as ApiError);
        return;
      }

      // Track which fields have meaningful values (excluding 'type')
      const meaningfulFields = Object.keys(data).filter(key => 
        data[key] !== undefined && 
        data[key] !== '' && 
        key !== 'type'
      );
      
      // set the filled fields to our new meaningful fields
      setFilledFields(meaningfulFields);

      // Send data to parent component using a callback to merge with previous data
      onAudioProcessed((prevData: Record<string, any>) => {
        const result = { ...prevData };
        
        // Only update fields that have meaningful values
        meaningfulFields.forEach(key => {
          result[key] = data[key];
        });
        
        return result;
      });
    } catch (err) {
      console.error("Error processing audio:", err);
      setError({
        error: "Failed to process audio. Please try again.",
        type: ErrorType.SERVER_ERROR,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const renderErrorMessage = () => {
    if (!error) return null;

    switch (error.type) {
      case ErrorType.MIC_PERMISSION:
        return (
          <div className="px-6 py-4 bg-red-50 border-t border-red-100 text-red-600">
            <div className="flex items-center mb-2">
              <MicOff size={16} className="mr-2" />
              <span className="font-medium">Microphone Access Needed</span>
            </div>
            <p className="text-sm mb-3">{error.error}</p>
            <button
              onClick={requestMicrophonePermission}
              className="w-full text-sm px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Request Microphone Access
            </button>
            <p className="text-xs mt-3 text-red-500">
              If you&apos;ve denied permission, you may need to reset it in your browser settings:
              <br />
              • Chrome: Click the lock icon in the address bar
              <br />
              • Firefox: Click the shield icon in the address bar
              <br />
              • Safari: Go to Preferences → Websites → Microphone
            </p>
          </div>
        );

      case ErrorType.BROWSER_SUPPORT:
        return (
          <div className="px-6 py-4 bg-red-50 border-t border-red-100 text-red-600">
            <div className="flex items-center">
              <AlertCircle size={16} className="mr-2" />
              <span className="font-medium">Browser Not Supported</span>
            </div>
            <p className="text-sm mt-1">{error.error}</p>
          </div>
        );

      case ErrorType.INVALID_FORMAT:
        return (
          <div className="px-6 py-4 bg-amber-50 border-t border-amber-100 text-amber-700">
            <div className="flex items-center">
              <AlertCircle size={16} className="mr-2" />
              <span className="font-medium">Processing Issue</span>
            </div>
            <p className="text-sm mt-1">
              We had trouble processing your recording. Try again with a clearer description, 
              or fill in the form manually.
            </p>
          </div>
        );

      case ErrorType.INSUFFICIENT_INFO:
      case ErrorType.API_ERROR:
      case ErrorType.SERVER_ERROR:
      default:
        return (
          <div className="px-6 py-4 bg-red-50 border-t border-red-100 text-red-600">
            <div className="flex items-center">
              <AlertCircle size={16} className="mr-2" />
              <span className="font-medium">Error</span>
            </div>
            <p className="text-sm mt-1">{error.error}</p>
          </div>
        );
    }
  };

  const renderMicrophoneButton = () => {
    if (!microphoneAvailable) {
      return (
        <button
          onClick={requestMicrophonePermission}
          className="p-6 bg-gray-200 text-gray-500 rounded-full cursor-pointer shadow-lg hover:bg-gray-300 transition-all"
          aria-label="Request microphone access"
        >
          <MicOff size={32} />
        </button>
      );
    }

    if (!isRecording) {
      return (
        <button
          onClick={startRecording}
          disabled={isProcessing}
          className="p-7 bg-red-500 text-white rounded-full hover:bg-red-600 disabled:bg-gray-300 disabled:text-gray-400 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all"
          aria-label="Start recording"
        >
          <Mic size={34} />
        </button>
      );
    }

    return (
      <div className="flex flex-col items-center">
        <button
          onClick={stopRecording}
          className="p-7 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-lg hover:shadow-xl transition-all relative"
          aria-label="Stop recording"
        >
          <div className="absolute inset-0 rounded-full border-4 border-red-400 animate-ping opacity-40"></div>
          <Square size={34} />
        </button>
        <div className="mt-2 text-red-600 text-sm font-medium">
          Click to stop
        </div>
      </div>
    );
  };

  return (
    <div className="my-6 rounded-xl overflow-hidden bg-gradient-to-b from-gray-50 to-white">
      {/* Main recording interface */}
      <div className="flex flex-col items-center p-6">
        <h3 className="text-lg font-medium text-gray-700 mb-2">
          {isRecording ? "Recording Your " + postType : "Describe Your " + postType}
        </h3>
        
        {/* Central microphone button with prominent styling */}
        <div className="my-5 relative">
          {renderMicrophoneButton()}
        </div>
        
        {/* Status text - changes based on current state */}
        <div className="h-8 text-center">
          {isProcessing && (
            <div className="inline-flex items-center text-sm text-blue-600 font-medium">
              <Loader2 size={16} className="animate-spin mr-2" />
              Processing audio...
            </div>
          )}
          
          {isRecording && (
            <div className="px-3 py-1 bg-red-50 rounded-full inline-flex items-center text-sm text-red-600 font-medium border border-red-200">
              <span className="inline-block h-2 w-2 bg-red-500 rounded-full mr-2 animate-pulse"></span>
              Recording in progress
            </div>
          )}
          
          {!isRecording && !isProcessing && (
            <span className="text-sm text-gray-500">
              {microphoneAvailable ? "Click microphone to start recording" : "Microphone access required"}
            </span>
          )}
        </div>
        
        {/* Show which fields have been populated */}
        {filledFields.length > 0 && !isRecording && !isProcessing && (
          <div className="mt-3 text-xs text-green-600">
            <span className="font-medium">Fields populated:</span>{' '}
            {filledFields.join(', ')}
          </div>
        )}
      </div>

      {/* Helper text in a more subtle footer */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
        <p className="flex items-center justify-center gap-1">
          <Info size={12} />
          <span>
            {filledFields.length > 0 
              ? "You can record multiple times to fill in or update fields." 
              : "Speech recognition works best with English. We'll prioritize extracting a title, while other fields will be filled when possible."}
          </span>
        </p>
      </div>
      
      {/* Error messages displayed at the bottom when present */}
      {error && (
        <div>
          {renderErrorMessage()}
        </div>
      )}
    </div>
  );
};
