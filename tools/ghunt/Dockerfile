FROM python:3.11-slim

WORKDIR /app

# Install dependencies
RUN apt-get update && apt-get install -y \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install GHunt via pip (handles all dependencies automatically)
RUN pip install --no-cache-dir ghunt

# Create results directory
RUN mkdir -p /results

# Set entrypoint
ENTRYPOINT ["ghunt"]
CMD ["--help"]
