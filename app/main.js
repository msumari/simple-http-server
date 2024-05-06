const net = require("net");
const fs = require("fs");
const path = require("path");

const uploadFile = (filePath, fileContent) => {
  try {
    fs.writeFileSync(filePath, fileContent);
    return true;
  } catch (error) {
    console.log("error", error);
    return false;
  }
};

const requestParser = (data) => {
  const dataString = data.toString("utf-8");
  const [firstLine, host, userAgentString] = dataString.split("\r\n");
  const headers = dataString.split("\r\n\r\n");
  const body = headers[headers.length - 1];
  const [method, requestPath, protocol] = firstLine.split(" ");
  const userAgent = userAgentString.slice(12);
  if (requestPath.startsWith("/echo/")) {
    const content = requestPath.slice(6);
    return { method, requestPath, protocol, content };
  }
  if (requestPath === "/user-agent") {
    return { method, requestPath, protocol, userAgent };
  }

  if (requestPath.startsWith("/files/") && process.argv[2] === "--directory") {
    const directory = process.argv[3];
    const filePath = requestPath.slice(7);
    const fullPath = path.join(directory, filePath);

    if (method === "GET") {
      if (fs.existsSync(fullPath)) {
        try {
          const fileContent = fs.readFileSync(fullPath, {
            encoding: "utf-8",
          });

          return { method, requestPath, protocol, fileContent };
        } catch (error) {
          console.log("error", error);
          return { method, requestPath, protocol, fileContent: undefined };
        }
      }
    } else if (method === "POST") {
      try {
        const uploadStatus = uploadFile(fullPath, body);
        return { method, requestPath, protocol, uploadStatus };
      } catch (error) {
        console.log("error", error);
        return { method, requestPath, protocol, uploadStatus: false };
      }
    }
  }

  return { method, requestPath, protocol };
};

const server = net.createServer();
server.on("connection", (socket) => {
  console.log("Client connected");

  socket.on("data", (data) => {
    const {
      method,
      requestPath,
      protocol,
      userAgent,
      content,
      fileContent,
      uploadStatus,
    } = requestParser(data);
    console.log(uploadStatus, method);

    if (content) {
      socket.write(
        `HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length:${content.length}\r\n\r\n${content}`
      );
    }
    if (userAgent) {
      socket.write(
        `HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length:${userAgent.length}\r\n\r\n${userAgent}`
      );
    }
    if (uploadStatus) {
      socket.write(`HTTP/1.1 201 Created success\r\n\r\n`);
    }

    if (requestPath === "/") {
      socket.write("HTTP/1.1 200 OK\r\n\r\n");
      socket.end();
      server.close();
    } else if (fileContent) {
      socket.write(
        `HTTP/1.1 200 OK\r\nContent-Type: application/octet-stream\r\nContent-Length:${fileContent.length}\r\n\r\n${fileContent}`
      );
    } else {
      socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
      socket.end();
      server.close();
    }
  });
});

server.listen(4221, "localhost");
