# Local Ollama setup

Verified November 1, 2026 on Johan's laptop. Ollama was already installed; Qwen3.5 4B has now been downloaded and tested. The existing Qwen3 8B model was preserved.

## Start chatting

Open PowerShell and run:

```powershell
ollama run qwen3.5:4b --think=false
```

This uses the local model and disables thinking for faster direct answers. In interactive chat, `/bye` exits. To release the model's GPU memory:

```powershell
ollama stop qwen3.5:4b
```

Useful checks:

```powershell
ollama list
ollama ps
```

Ollama is reachable locally at `http://127.0.0.1:11434`. The listener was verified as loopback only; no public tunnel or firewall rule was added. Local access does not require a Gemini key.

## Verified configuration and results

- Ollama 0.35.1; the installed model requires at least 0.30.0.
- Model `qwen3.5:4b`, ID `d8b0f5e9760c`, Q4_K_M, approximately 3.3 GB.
- NVIDIA GeForce RTX 4060 Laptop GPU, 8 GB VRAM.
- API tests used `think: false`, `num_ctx: 8192`, `temperature: 0`, one request at a time, and bounded output limits. To select that context in interactive chat, enter `/set parameter num_ctx 8192`.
- Chat smoke test passed: 20.0 seconds including 13.2 seconds loading.
- Warm structured-JSON smoke test passed: 1.2 seconds, 76 output tokens, approximately 69.1 output tokens/second.
- `ollama ps` reported 100% GPU and an 8192-token context. GPU memory in use was about 4.8 GB in the sample.

These are small smoke tests, not full repository-analysis or concurrency benchmarks. The advertised model maximum context is much larger than practical GPU memory; retain the tested bounded context until larger workloads are measured.

## Unforked integration status

The hosted Unforked extension still uses Gemini. Installing this model does not automatically connect it to the hosted backend. Sharing laptop inference with friends requires a local provider adapter, an authenticated gateway/connection, bounded queueing, offline handling, and updated privacy disclosures. No cloud deployment or provider-secret change was made during this installation.

Official references: [model](https://ollama.com/library/qwen3.5:4b), [chat API](https://docs.ollama.com/api/chat), [Ollama FAQ](https://docs.ollama.com/faq).
