#include <array>
#include <cerrno>
#include <csignal>
#include <cstring>
#include <iostream>
#include <sstream>
#include <string>

#include <arpa/inet.h>
#include <netinet/in.h>
#include <sys/socket.h>
#include <unistd.h>

#include "beam/beam.hpp"

namespace {

volatile std::sig_atomic_t keepRunning = 1;

void handleSignal(int) {
    keepRunning = 0;
}

struct Request {
    std::string method;
    std::string path;
    std::string body;
};

// Reads a full HTTP request (headers + body, using Content-Length) off a
// blocking socket. Minimal by design: this server only ever needs to
// understand a couple of fixed routes, not general HTTP.
Request readRequest(int clientFd) {
    std::string buffer;
    std::array<char, 4096> chunk{};

    size_t headerEnd = std::string::npos;
    while (headerEnd == std::string::npos) {
        ssize_t n = ::read(clientFd, chunk.data(), chunk.size());
        if (n <= 0) break;
        buffer.append(chunk.data(), static_cast<size_t>(n));
        headerEnd = buffer.find("\r\n\r\n");
    }

    Request request;
    if (headerEnd == std::string::npos) return request;

    std::istringstream headerStream(buffer.substr(0, headerEnd));
    std::string requestLine;
    std::getline(headerStream, requestLine);
    std::istringstream lineStream(requestLine);
    std::string httpVersion;
    lineStream >> request.method >> request.path >> httpVersion;

    size_t contentLength = 0;
    std::string headerLine;
    while (std::getline(headerStream, headerLine)) {
        if (headerLine.rfind("Content-Length:", 0) == 0 || headerLine.rfind("content-length:", 0) == 0) {
            contentLength = static_cast<size_t>(std::stoul(headerLine.substr(headerLine.find(':') + 1)));
        }
    }

    size_t bodyStart = headerEnd + 4;
    std::string body = buffer.substr(bodyStart);
    while (body.size() < contentLength) {
        ssize_t n = ::read(clientFd, chunk.data(), chunk.size());
        if (n <= 0) break;
        body.append(chunk.data(), static_cast<size_t>(n));
    }
    request.body = body;
    return request;
}

std::string buildResponse(int statusCode, const std::string& statusText, const std::string& body) {
    std::ostringstream out;
    out << "HTTP/1.1 " << statusCode << " " << statusText << "\r\n"
        << "Content-Type: application/json\r\n"
        << "Content-Length: " << body.size() << "\r\n"
        << "Access-Control-Allow-Origin: *\r\n"
        << "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n"
        << "Access-Control-Allow-Headers: Content-Type\r\n"
        << "Connection: close\r\n\r\n"
        << body;
    return out.str();
}

std::string errorJson(const std::string& message) {
    std::string escaped;
    for (char c : message) {
        if (c == '"' || c == '\\') escaped.push_back('\\');
        escaped.push_back(c);
    }
    return "{ \"error\": \"" + escaped + "\" }";
}

std::string handleRequest(const Request& request) {
    if (request.method == "OPTIONS") {
        return buildResponse(204, "No Content", "");
    }
    if (request.method == "GET" && request.path == "/api/health") {
        return buildResponse(200, "OK", "{ \"status\": \"ok\" }");
    }
    if (request.method == "POST" && request.path == "/api/beam/design") {
        try {
            beam::Beam b = beam::Beam::fromJson(request.body);
            beam::AnalysisResult analysis = b.analyze();
            beam::DesignResult design = b.design();
            std::string body = "{ \"analysis\": " + beam::toJson(analysis) +
                                ", \"design\": " + beam::toJson(design) + " }";
            return buildResponse(200, "OK", body);
        } catch (const std::exception& e) {
            return buildResponse(400, "Bad Request", errorJson(e.what()));
        }
    }
    return buildResponse(404, "Not Found", errorJson("Not found: " + request.method + " " + request.path));
}

} // namespace

int main() {
    std::signal(SIGINT, handleSignal);
    std::signal(SIGTERM, handleSignal);

    constexpr int port = 8080;

    const int serverFd = ::socket(AF_INET, SOCK_STREAM, 0);
    if (serverFd < 0) {
        std::cerr << "Failed to create socket: " << std::strerror(errno) << "\n";
        return 1;
    }

    const int reuse = 1;
    if (::setsockopt(serverFd, SOL_SOCKET, SO_REUSEADDR, &reuse, sizeof(reuse)) < 0) {
        std::cerr << "Failed to set socket options: " << std::strerror(errno) << "\n";
        ::close(serverFd);
        return 1;
    }

    sockaddr_in address{};
    address.sin_family = AF_INET;
    address.sin_addr.s_addr = htonl(INADDR_ANY);
    address.sin_port = htons(port);

    if (::bind(serverFd, reinterpret_cast<sockaddr*>(&address), sizeof(address)) < 0) {
        std::cerr << "Failed to bind on port " << port << ": " << std::strerror(errno) << "\n";
        ::close(serverFd);
        return 1;
    }

    if (::listen(serverFd, SOMAXCONN) < 0) {
        std::cerr << "Failed to listen: " << std::strerror(errno) << "\n";
        ::close(serverFd);
        return 1;
    }

    std::cout << "Beam API running on http://localhost:" << port << "\n";

    while (keepRunning) {
        sockaddr_in clientAddress{};
        socklen_t clientLen = sizeof(clientAddress);
        const int clientFd = ::accept(serverFd, reinterpret_cast<sockaddr*>(&clientAddress), &clientLen);
        if (clientFd < 0) {
            if (errno == EINTR) continue;
            std::cerr << "Accept failed: " << std::strerror(errno) << "\n";
            break;
        }

        Request request = readRequest(clientFd);
        std::string response = handleRequest(request);
        (void)::write(clientFd, response.c_str(), response.size());
        ::close(clientFd);
    }

    ::close(serverFd);
    std::cout << "Beam API stopped\n";
    return 0;
}
