FROM python:3.11-slim

# Install dependencies
RUN apt-get update && apt-get install -y \
    git \
    && rm -rf /var/lib/apt/lists/*

# Clone and install Recon-ng
WORKDIR /opt
RUN git clone https://github.com/lanmaster53/recon-ng.git
WORKDIR /opt/recon-ng
RUN pip install --no-cache-dir -r REQUIREMENTS

# Create results and workspace directory
RUN mkdir -p /results /root/.recon-ng

WORKDIR /opt/recon-ng

ENTRYPOINT ["python", "recon-ng"]
