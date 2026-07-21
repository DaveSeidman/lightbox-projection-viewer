import { useEffect, useRef, useState } from "react";

export const MAX_MEDIA_FILES = 4;

export function useObjectUrls() {
  const [files, setFilesState] = useState([]);
  const objectUrlsRef = useRef(new Map());

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrlsRef.current.clear();
    };
  }, []);

  const setFiles = (nextFiles) => {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current.clear();

    const records = nextFiles.slice(0, MAX_MEDIA_FILES).map((file, index) => {
      const id = `${Date.now()}-${index}-${file.name}`;
      const url = URL.createObjectURL(file);
      objectUrlsRef.current.set(id, url);
      return { id, name: file.name, type: file.type, url };
    });

    setFilesState(records);
    return records;
  };

  const clearFile = (id) => {
    const url = objectUrlsRef.current.get(id);
    if (url) URL.revokeObjectURL(url);
    objectUrlsRef.current.delete(id);
    setFilesState((current) => current.filter((file) => file.id !== id));
  };

  const clearFiles = () => {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current.clear();
    setFilesState([]);
  };

  return { files, setFiles, clearFile, clearFiles };
}
