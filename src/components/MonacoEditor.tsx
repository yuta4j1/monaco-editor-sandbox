import React, { useEffect, useRef, useState } from "react";
import Editor, { type BeforeMount, type OnMount } from "@monaco-editor/react";
// 型のみ参照する（実体は @monaco-editor/react が CDN から読み込む）
import type * as MonacoApi from "monaco-editor";
import styles from "./Editor.module.css";

type Monaco = typeof MonacoApi;
type CodeEditor = MonacoApi.editor.IStandaloneCodeEditor;

const initialFiles: Record<string, string> = {
  "main.ts": [
    'import { add } from "./math";',
    'import { greet } from "./greet";',
    "",
    "console.log(greet(\"world\"));",
    "console.log(add(1, 2));",
  ].join("\n"),
  "math.ts": [
    "export function add(a: number, b: number): number {",
    "  return a + b;",
    "}",
  ].join("\n"),
  "greet.ts": [
    "export function greet(name: string): string {",
    "  return `Hello, ${name}!`;",
    "}",
  ].join("\n"),
};

export const MonacoEditor: React.FC = () => {
  const [paths, setPaths] = useState(() => Object.keys(initialFiles));
  const [activePath, setActivePath] = useState(paths[0]);
  // エディタオープナーのコールバックから最新のファイル一覧を参照するため
  const pathsRef = useRef(paths);
  pathsRef.current = paths;
  const monacoRef = useRef<Monaco | null>(null);
  const editorRef = useRef<CodeEditor | null>(null);
  // ファイルを切り替えた後に適用するジャンプ先
  const pendingSelectionRef = useRef<MonacoApi.IRange | MonacoApi.IPosition | null>(null);
  const openerRef = useRef<MonacoApi.IDisposable | null>(null);

  const handleBeforeMount: BeforeMount = m => {
    const monaco = m as unknown as Monaco;
    monacoRef.current = monaco;

    const { typescriptDefaults, ScriptTarget, ModuleKind, ModuleResolutionKind } = monaco.typescript;
    typescriptDefaults.setCompilerOptions({
      target: ScriptTarget.ESNext,
      module: ModuleKind.ESNext,
      moduleResolution: ModuleResolutionKind.NodeJs,
      allowNonTsExtensions: true,
      strict: true,
    });
    // 開いていないファイルも型解決の対象にする
    typescriptDefaults.setEagerModelSync(true);

    // 全ファイルのモデルを先に作っておくと、ファイルをまたいだ import が解決できる
    for (const [path, content] of Object.entries(initialFiles)) {
      const uri = monaco.Uri.parse(path);
      if (!monaco.editor.getModel(uri)) {
        monaco.editor.createModel(content, "typescript", uri);
      }
    }
  };

  const handleMount: OnMount = editor => {
    const monaco = monacoRef.current;
    if (!monaco) return;
    editorRef.current = editor as unknown as CodeEditor;

    // 「定義へ移動」で別ファイルを開くときに呼ばれる
    openerRef.current = monaco.editor.registerEditorOpener({
      openCodeEditor(_source, resource, selectionOrPosition) {
        // resource は file:///main.ts の形で届くので、先頭の "/" を除いてファイル名に戻す
        const path = resource.path.slice(1);
        // TypeScript の標準ライブラリ定義などプロジェクト外のファイルには切り替えない
        if (!pathsRef.current.includes(path)) return false;
        pendingSelectionRef.current = selectionOrPosition ?? null;
        setActivePath(path);
        return true;
      },
    });
  };

  useEffect(() => () => openerRef.current?.dispose(), []);

  // モデル切り替え後にジャンプ先へカーソルを移動する
  useEffect(() => {
    const editor = editorRef.current;
    const target = pendingSelectionRef.current;
    if (!editor || !target) return;
    pendingSelectionRef.current = null;

    if ("lineNumber" in target) {
      editor.setPosition(target);
      editor.revealPositionInCenter(target);
    } else {
      editor.setSelection(target);
      editor.revealRangeInCenter(target);
    }
    editor.focus();
  }, [activePath]);

  const handleAddFile = () => {
    const monaco = monacoRef.current;
    if (!monaco) return;
    const name = window.prompt("ファイル名を入力してください（例: utils.ts）")?.trim();
    if (!name) return;

    const path = name.replace(/^\/+/, "");
    if (paths.includes(path)) {
      window.alert(`${name} は既に存在します`);
      return;
    }
    const uri = monaco.Uri.parse(path);
    if (!monaco.editor.getModel(uri)) {
      monaco.editor.createModel("", "typescript", uri);
    }
    setPaths(prev => [...prev, path]);
    setActivePath(path);
  };

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <span>FILES</span>
          <button type="button" className={styles.addButton} onClick={handleAddFile}>
            ＋
          </button>
        </div>
        <ul className={styles.fileList}>
          {paths.map(path => (
            <li key={path}>
              <button
                type="button"
                className={path === activePath ? `${styles.file} ${styles.active}` : styles.file}
                onClick={() => setActivePath(path)}
              >
                {path}
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <div className={styles.editor}>
        <Editor
          height="100%"
          path={activePath}
          defaultLanguage="typescript"
          theme="vs-dark"
          beforeMount={handleBeforeMount}
          onMount={handleMount}
        />
      </div>
    </div>
  );
};
