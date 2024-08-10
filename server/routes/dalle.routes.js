import express from "express";
import * as dotenv from "dotenv";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";

dotenv.config();

const router = express.Router();

const HUGGING_FACE_API_KEY = "Bearer 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";

router.route("/").get((req, res) => {
  res.status(200).json({ message: "hello from router" });
});

router.route("/").post(async (req, res) => {
  try {
    let { prompt } = req.body;

    // Modify the prompt to specify the desired output
    prompt = `${prompt},  A simple, abstract T-shirt design pattern, no human model, plain background, centered design`;

    const response = await fetch(
      "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0",
      {
        headers: {
          Authorization: HUGGING_FACE_API_KEY,
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({ inputs: prompt }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    const base64Image = Buffer.from(buffer).toString("base64");

    res.status(200).json({ photo: base64Image });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

export default router;
