const net = require("net");

// You can use print statements as follows for debugging, they'll be visible when running tests.
// console.log("Logs from your program will appear here!");

// Uncomment this to pass the first stage
const requestParser = (data) => {
  const dataString = data.toString("utf-8");
  const [firstLine, host, userAgentString] = dataString.split("\r\n");
  const [method, path, protocol] = firstLine.split(" ");
  const userAgent = userAgentString.slice(12);
  if (path.startsWith("/echo/")) {
    const content = path.slice(6);
    return { method, path, protocol, content };
  }
  if (path === "/user-agent") {
    return { method, path, protocol, userAgent };
  }
  return { method, path, protocol };
};

const server = net.createServer();
server.on("connection", (socket) => {
  console.log("Client connected");

  socket.on("data", (data) => {
    const { method, path, protocol, userAgent, content } = requestParser(data);
    console.log(userAgent, content);
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
    if (path === "/") {
      socket.write("HTTP/1.1 200 OK\r\n\r\n");
      socket.end();
      server.close();
    } else {
      socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
      socket.end();
      server.close();
    }
  });
});

server.listen(4221, "localhost");
