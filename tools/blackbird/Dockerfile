FROM python:3.11-slim

WORKDIR /app

# Install dependencies
RUN apt-get update && apt-get install -y \
    git \
    && rm -rf /var/lib/apt/lists/*

# Clone Blackbird
RUN git clone https://github.com/p1ngul1n0/blackbird.git . && \
    pip install --no-cache-dir -r requirements.txt

# Create results directory
RUN mkdir -p /results

# Set entrypoint
ENTRYPOINT ["python3", "blackbird.py"]
CMD ["--help"]
