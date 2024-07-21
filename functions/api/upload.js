import formidable from "formidable";
import fs from "fs/promises";
import path from "path";
import {
  parseInterfaces,
  transformToGraphData,
  transformToTreeData,
} from "../../utils/parseInterfaces";
import CircularJSON from "circular-json";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  const uploadDir = path.join(process.cwd(), "tmp");
  try {
    await fs.mkdir(uploadDir, { recursive: true });
  } catch (err) {
    console.error("Error creating upload directory", err);
    return res.status(500).json({ error: "Internal server error" });
  }

  const form = formidable({
    multiples: false,
    uploadDir: uploadDir,
    keepExtensions: true,
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("Error parsing the files", err);
      return res.status(500).json({ error: "File upload failed" });
    }

    const file = Array.isArray(files.file) ? files.file[0] : files.file;

    if (!file || !file.filepath) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = file.filepath;

    try {
      const fileContent = await fs.readFile(filePath, "utf-8");
      const references = parseInterfaces(fileContent);

      const treeData = transformToTreeData(references);
      const graphData = transformToGraphData(references);

      const encodedData = CircularJSON.stringify({ treeData, graphData });

      res.setHeader("Content-Type", "application/json");
      res.status(200).send(encodedData);
    } catch (readErr) {
      console.error("Error reading the file", readErr);
      res.status(500).json({ error: "Error reading the file" });
    } finally {
      try {
        await fs.unlink(filePath);
      } catch (unlinkErr) {
        console.error("Error deleting the file", unlinkErr);
      }
    }
  });
}
