#include <array>
#include <cerrno>
#include <csignal>
#include <cstring>
#include <iostream>
#include <string>

#include <arpa/inet.h>
#include <netinet/in.h>
#include <sys/socket.h>
#include <unistd.h>

namespace {

volatile std::sig_atomic_t keepRunning = 1;

void handleSignal(int) {
    keepRunning = 0;
}

} // namespace

int main() {
    std::signal(SIGINT, handleSignal);
    std::signal(SIGTERM, handleSignal);

    constexpr int port = 8080;
    const std::string body = "here we go again\n";
    const std::string response =
        "HTTP/1.1 200 OK\r\n"
        "Content-Type: text/plain; charset=utf-8\r\n"
        "Content-Length: " + std::to_string(body.size()) + "\r\n"
        "Connection: close\r\n\r\n" +
        body;

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
            if (errno == EINTR) {
                continue;
            }
            std::cerr << "Accept failed: " << std::strerror(errno) << "\n";
            break;
        }

        std::array<char, 1024> requestBuffer{};
        (void)::read(clientFd, requestBuffer.data(), requestBuffer.size());
        (void)::write(clientFd, response.c_str(), response.size());
        ::close(clientFd);
    }

    ::close(serverFd);
    std::cout << "Beam API stopped\n";

    return 0;
}
