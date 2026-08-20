from http.server import HTTPServer, SimpleHTTPRequestHandler
import time

class NoCacheHTTPRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Disable all caching to force browser to load fresh files every time
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

if __name__ == '__main__':
    server_address = ('', 3004)
    httpd = HTTPServer(server_address, NoCacheHTTPRequestHandler)
    print("Serving with NO CACHE at http://localhost:3004/")
    httpd.serve_forever()