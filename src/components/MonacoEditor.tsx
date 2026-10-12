import React, { useState, useRef, useEffect, useCallback } from "react";
import Editor from "@monaco-editor/react";
import styles from "./Editor.module.css";

const initialCode = [
  "function x() {",
  '\tconsole.log("Hello world!");',
  "}",
].join("\n");

interface MonacoEditorProps {}

export const MonacoEditor: React.FC<MonacoEditorProps> = props => {
  const editorRef = useRef(null);

  return (
    <Editor
      height="90vh"
      defaultLanguage="typescript"
      defaultValue={initialCode}
    />
  );
};
