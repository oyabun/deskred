FROM python:3.11-slim

WORKDIR /app

# Install dependencies
RUN apt-get update && apt-get install -y \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Maigret
RUN pip install --no-cache-dir maigret

# Create results directory
RUN mkdir -p /app/results

WORKDIR /app/results

ENTRYPOINT ["maigret"]
