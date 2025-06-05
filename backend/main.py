from fastapi import FastAPI, Query
from fastapi.responses import StreamingResponse
import subprocess

app = FastAPI()


@app.get("/stream")
def stream_torrent(magnet: str = Query(...)):
    cmd = [
        # use `webtorrent`, not `webtorrent-hybrid`
        "webtorrent",
        magnet,
        "--select", "0",        # select first file in torrent
        "--stdout"              # stream it to stdout
    ]

    process = subprocess.Popen(cmd, stdout=subprocess.PIPE)

    return StreamingResponse(
        process.stdout,
        media_type="video/mp4",
        headers={"Accept-Ranges": "bytes"}
    )
