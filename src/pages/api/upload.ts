import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import fs from "fs/promises";
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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const form = formidable({
    multiples: false,
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

    try {
      // Read the file content directly from the uploaded file
      const fileContent = await fs.readFile(file.filepath, "utf-8");

      // Process the file content
      const references = parseInterfaces(fileContent);
      const treeData = transformToTreeData(references);
      const graphData = transformToGraphData(references);

      // Prepare the response
      const encodedData = CircularJSON.stringify({ treeData, graphData });

      res.setHeader("Content-Type", "application/json");
      res.status(200).send(encodedData);
    } catch (readErr) {
      console.error("Error reading the file", readErr);
      res.status(500).json({ error: "Error processing the file" });
    }
  });
}
