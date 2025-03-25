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

      onAudioProcessed(data);
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
          <div className="flex flex-col space-y-2 text-red-600 bg-red-50 p-3 rounded-md">
            <div className="flex items-center">
              <MicOff size={16} className="mr-2" />
              <span className="font-semibold">Microphone Access Needed</span>
            </div>
            <p className="text-sm">{error.error}</p>
            <button
              onClick={requestMicrophonePermission}
              className="mt-2 text-sm px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Request Microphone Access
            </button>
            <p className="text-xs mt-1">
              If you've denied permission, you may need to reset it in your
              browser settings:
              <br />
              • Chrome: Click the lock/info icon in the address bar
              <br />
              • Firefox: Click the shield icon in the address bar
              <br />• Safari: Go to Preferences → Websites → Microphone
            </p>
          </div>
        );

      case ErrorType.BROWSER_SUPPORT:
        return (
          <div className="flex flex-col space-y-2 text-red-600 bg-red-50 p-3 rounded-md">
            <div className="flex items-center">
              <AlertCircle size={16} className="mr-2" />
              <span className="font-semibold">Browser Not Supported</span>
            </div>
            <p className="text-sm">{error.error}</p>
          </div>
        );

      case ErrorType.INSUFFICIENT_INFO:
        return (
          <div className="flex flex-col space-y-2 text-amber-600 bg-amber-50 p-3 rounded-md">
            <div className="flex items-center">
              <Info size={16} className="mr-2" />
              <span className="font-semibold">Not enough information</span>
            </div>
            <p className="text-sm">
              I couldn't gather enough details from your recording. Please try
              again with more specific information.
            </p>
            {error.missingFields && error.missingFields.length > 0 && (
              <div className="text-xs mt-1">
                <span>I need information about: </span>
                <span className="font-medium">
                  {error.missingFields.join(", ")}
                </span>
              </div>
            )}
          </div>
        );

      case ErrorType.INVALID_FORMAT:
        return (
          <div className="flex flex-col space-y-2 text-orange-600 bg-orange-50 p-3 rounded-md">
            <div className="flex items-center">
              <AlertCircle size={16} className="mr-2" />
              <span className="font-semibold">Format issue</span>
            </div>
            <p className="text-sm">
              I had trouble extracting structured data from your recording.
              Please try again with a clearer description of your {postType.toLowerCase()}.
            </p>
          </div>
        );

      case ErrorType.API_ERROR:
      case ErrorType.SERVER_ERROR:
      default:
        return (
          <div className="flex flex-col space-y-2 text-red-600 bg-red-50 p-3 rounded-md">
            <div className="flex items-center">
              <AlertCircle size={16} className="mr-2" />
              <span className="font-semibold">Error</span>
            </div>
            <p className="text-sm">{error.error}</p>
          </div>
        );
    }
  };

  const renderMicrophoneButton = () => {
    if (!microphoneAvailable) {
      return (
        <button
          onClick={requestMicrophonePermission}
          className="p-4 bg-gray-500 text-white rounded-full cursor-pointer"
          aria-label="Request microphone access"
        >
          <div className="flex items-center justify-center">
            <MicOff size={24} />
          </div>
        </button>
      );
    }

    if (!isRecording) {
      return (
        <button
          onClick={startRecording}
          disabled={isProcessing || !microphoneAvailable}
          className="p-4 bg-red-600 text-white rounded-full hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          aria-label="Start recording"
        >
          <Mic size={24} />
        </button>
      );
    }

    return (
      <button
        onClick={stopRecording}
        className="p-4 bg-gray-700 text-white rounded-full hover:bg-gray-800"
        aria-label="Stop recording"
      >
        <Square size={24} />
      </button>
    );
  };

  const getStatusMessage = () => {
    if (isRecording) {
      return (
        <span className="text-red-500 flex items-center">
          <span className="inline-block h-2 w-2 bg-red-500 rounded-full mr-2 animate-pulse"></span>
          Recording...
        </span>
      );
    }

    if (!microphoneAvailable) {
      return <span className="text-red-500">Microphone access required</span>;
    }

    return <span>Ready to record</span>;
  };

  return (
    <div className="flex flex-col items-center space-y-4 my-6 p-4 border border-gray-200 rounded-lg">
      <h3 className="text-lg font-medium text-gray-700">Record Your {postType}</h3>
      <p className="text-sm text-gray-500 text-center">
        Click the microphone and describe your {postType.toLowerCase()}. We'll fill out the form
        for you.
      </p>
      <p className="text-xs text-gray-500 text-center italic">
        Note: Speech recognition is optimized for English audio
      </p>

      <div className="flex justify-center">{renderMicrophoneButton()}</div>

      {isProcessing && (
        <div className="flex items-center text-sm text-blue-600">
          <Loader2 size={16} className="animate-spin mr-2" />
          Processing your recording...
        </div>
      )}

      {error && renderErrorMessage()}

      <div className="text-xs text-gray-500 mt-2">{getStatusMessage()}</div>
    </div>
  );
};
