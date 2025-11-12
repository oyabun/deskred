FROM python:3.11-slim

# Install dependencies
RUN apt-get update && apt-get install -y \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Sherlock
WORKDIR /app
RUN pip install --no-cache-dir sherlock-project

# Create results directory
RUN mkdir -p /results

WORKDIR /app

ENTRYPOINT ["sherlock"]
