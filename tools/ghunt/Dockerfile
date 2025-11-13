FROM python:3.11-slim

WORKDIR /app

# Install dependencies
RUN apt-get update && apt-get install -y \
    git \
    && rm -rf /var/lib/apt/lists/*

# Clone GHunt
RUN git clone https://github.com/mxrch/GHunt.git .

# Install Python requirements
RUN pip install --no-cache-dir -r requirements.txt

# Create results directory
RUN mkdir -p /results

# Set entrypoint
ENTRYPOINT ["python3", "ghunt.py"]
CMD ["--help"]
