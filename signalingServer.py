from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib import parse

class Handler(BaseHTTPRequestHandler):
    offer = None
    answer = None

    def send_corsHeaders(self):
        self.send_header("Access-Control-Allow-Origin", "null")
        self.send_header("Access-Control-Allow-Method", "POST, GET")
        self.send_header("Access-Control-Allow-Headers", "*")

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_corsHeaders()
        self.end_headers()

    def do_GET(self):

        if self.path == '/offer' and self.offer:
            size, data = self.offer
        elif self.path == '/answer' and self.answer:
            size, data = self.answer
        else:
            self.send_response(204)
            self.send_corsHeaders()
            self.end_headers()
            return

        self.send_response(200)
        self.send_corsHeaders()
        self.send_header("Content-Type","application/json")
        self.send_header("Content-Length", size)
        self.end_headers()

        self.wfile.write(data)

    def do_POST(self):
        
        size = int(self.headers["content-length"])
        data = self.rfile.read(size)

        if self.path == '/offer':
            self.__class__.offer = [size, data]
        elif self.path == '/answer':
            self.__class__.answer = [size, data]
        else:
            self.send_response(204)
            self.send_corsHeaders()
            self.end_headers()
            return
            
        self.send_response(200)
        self.send_corsHeaders()
        self.end_headers()


HTTPServer.allow_reuse_address = True
HTTPServer.timeout = None
with HTTPServer(("0.0.0.0", 8080), Handler) as server:
    server.serve_forever()
