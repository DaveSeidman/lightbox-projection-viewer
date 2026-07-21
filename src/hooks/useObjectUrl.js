import { useEffect, useRef, useState } from "react";

export function useObjectUrl() {
  const [fileState, setFileState] = useState({ name: "", type: "", url: "" });
  const objectUrlRef = useRef("");

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const setFile = (file) => {
    if (!file) return;
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setFileState({ name: file.name, type: file.type, url });
  };

  const clearFile = () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = "";
    setFileState({ name: "", type: "", url: "" });
  };

  return { ...fileState, setFile, clearFile };
}
