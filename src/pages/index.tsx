import { useState } from "react";
import { useRouter } from "next/router";
import styles from "./index.module.css";
import CircularJSON from "circular-json";

const HomePage = () => {
  const [file, setFile] = useState<File | null>(null);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) {
      alert("Please select a file to upload.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (response.ok) {
      const data = await response.text();
      const decodedData = CircularJSON.parse(data);
      localStorage.setItem("graphData", JSON.stringify(decodedData.graphData));
      localStorage.setItem(
        "treeData",
        CircularJSON.stringify(decodedData.treeData)
      );
    } else {
      alert("File upload failed.");
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Upload TypeScript Definition File</h1>
      <form onSubmit={handleSubmit} className={styles.form}>
        <label htmlFor="file-upload" className={styles.labelFile}>
          Choose File
        </label>
        <input
          id="file-upload"
          type="file"
          onChange={handleFileChange}
          className={styles.inputFile}
        />
        <button type="submit" className={styles.button}>
          Upload
        </button>
      </form>
      <button onClick={() => router.push("/graph")} className={styles.button}>
        View Graph
      </button>
      <button onClick={() => router.push("/tree")} className={styles.button}>
        View Tree
      </button>
    </div>
  );
};

export default HomePage;
