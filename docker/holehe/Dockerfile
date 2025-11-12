FROM python:3.11-slim

WORKDIR /app

# Install dependencies
RUN apt-get update && apt-get install -y \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Holehe
RUN pip install --no-cache-dir holehe

# Create results directory
RUN mkdir -p /app/results

WORKDIR /app/results

ENTRYPOINT ["holehe"]
