import fs from "fs/promises";
import express, { Request, Response, Application } from "express";
import path from "path";
import asyncHandler from "express-async-handler";
import { authenticate } from "@google-cloud/local-auth";
import { google } from "googleapis";
const SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"];
const TOKEN_PATH = path.join(process.cwd(), "token.json");
const CREDENTIALS_PATH = path.join(process.cwd(), "credentials.json");

type Post = {
  title: string;
  content: string;
  publishedDate: string;
};

type PostData = Post | Post[] | null;

async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content.toString());
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

async function saveCredentials(client) {
  try {
    const content = await fs.readFile(CREDENTIALS_PATH);
    const keys = JSON.parse(content.toString());
    const key = keys.installed || keys.web;
    const payload = JSON.stringify({
      type: "authorized_user",
      client_id: key.client_id,
      client_secret: key.client_secret,
      refresh_token: client.credentials.refresh_token,
    });
    await fs.writeFile(TOKEN_PATH, payload);
  } catch (err) {
    throw new Error(
      "Missing credentials. Download credentials.json from https://console.developers.google.com/apis/credentials and save to the root directory of this project. Use OAuth 2.0"
    );
  }
}

async function authorize() {
  let client: any = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

const app: Application = express();
const port = process.env.PORT || 8000;

app.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    res.send(
      "Welcome to Google Sheets API with Node.js. Please add /post/:sheet-id/:post-id in url to get post."
    );
  })
);

async function listPost(
  auth,
  rowNumber: number,
  sheetID: string
): Promise<Post | null> {
  const sheets = google.sheets({ version: "v4", auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetID,
    range: `Sheet1!A${rowNumber}:C${rowNumber}`,
  });
  const row = res.data.values;
  if (!row || row.length === 0) {
    return null;
  }
  const [title, content, publishedDate] = row[0];

  return { title, content, publishedDate };
}

async function listPosts(auth, sheetID: string): Promise<Post[]> {
  const sheets = google.sheets({ version: "v4", auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetID,
    range: `Sheet1!A:Z`,
  });
  const row = res.data.values;
  if (!row || row.length === 0) {
    return null;
  }
  const allData =
    row.map((rowData) => ({
      title: rowData[0],
      content: rowData[1],
      publishedDate: rowData[2],
    })) ?? [];
  return allData;
}

app.get(
  `/post/:sheetId/:postId/`,
  asyncHandler(async (req: Request, res: Response) => {
    const authed = await authorize();
    if (!authed.credentials) {
      res.send("Missing credentials");
    }
    if (!req.params["sheetId"]) {
      res.send("Missing sheetId");
    }
    if (!req.params["postId"]) {
      res.send("Missing row number");
    }
    const rowNumber =
      Number(req.params["postId"]) > 1 ? Number(req.params["postId"]) : 2; // 0 doesn't exist. 1 is header.
    const post: PostData = await listPost(
      authed,
      rowNumber,
      req.params["sheetId"]
    );
    if (!post) {
      res.send("No data found");
    }
    const title = post?.title;
    const content = post?.content;
    const publishedDate = post?.publishedDate;
    const postHTML = `
      <h2>${title}</h2>
      <hr/>
      <h4>${publishedDate}</h4>
      <hr/>
      <br> 
      <p>${content}</p>
      `;
    res.send(postHTML);
  })
);

app.get(
  `/post/:sheetId/`,
  asyncHandler(async (req: Request, res: Response) => {
    const authed = await authorize();
    if (!authed.credentials) {
      res.send("Missing credentials");
    }
    if (!req.params["sheetId"]) {
      res.send("Missing sheetId");
    }

    const posts: PostData = await listPosts(authed, req.params["sheetId"]);
    if (posts.length === 0) {
      res.send("No data found");
    }
    const postsHTML = posts
      .map((post, index) => {
        if (index === 0) {
          return "";
        } else {
          return `<h2>${post.title}</h2>
          <hr/>
      <h4>${post.publishedDate}</h4>
      <hr/>
      <br>
      <p>${post.content}</p>`;
        }
      })
      .join("")
      .split("\n")
      .join("<br>");
    res.send(postsHTML);
  })
);

app.get(
  "/post",
  asyncHandler(async (req: Request, res: Response) => {
    res.send(
      `Please include a sheetId. <br>
      /post/:sheetId/ - get all posts <br>
      /post/:sheetId/:postId - get a single post.`
    );
  })
);

app.use((err: Error, req: Request, res: Response) => {
  console.log(res);
  console.log(req);
  console.error(err.stack);
  res.send("Something broke!");
});

app.listen(port, () => {
  console.clear();
  return console.log(`Express server is live at http://localhost:${port} 🚀`);
});
