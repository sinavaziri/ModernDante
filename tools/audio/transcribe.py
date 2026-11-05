# /// script
# dependencies = ["mlx-whisper==0.4.3"]
# ///
"""Transcribes MP3s for speech-check.mjs. Arguments are pairs of input MP3 and output JSON.

The mlx_whisper command line writes every result of a multi-file run under the
first file's name, so this calls the library and names each output itself.
"""
import json
import os
import sys

import mlx_whisper

MODEL = "mlx-community/whisper-large-v3-turbo"

pairs = sys.argv[1:]
for mp3, output in zip(pairs[0::2], pairs[1::2]):
    result = mlx_whisper.transcribe(
        mp3,
        path_or_hf_repo=MODEL,
        language="en",
        word_timestamps=True,
        condition_on_previous_text=False,  # stops one misheard line repeating through the rest
        hallucination_silence_threshold=2,
        verbose=None,
    )
    with open(f"{output}.tmp", "w") as file:
        json.dump(result, file)
    os.replace(f"{output}.tmp", output)
    print(f"transcribed {os.path.basename(mp3)}", flush=True)
