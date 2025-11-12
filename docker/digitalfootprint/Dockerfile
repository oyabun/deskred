FROM python:3.11-slim

WORKDIR /app

# Install git to clone the repository
RUN apt-get update && \
    apt-get install -y git && \
    rm -rf /var/lib/apt/lists/*

# Clone the Digital Footprint OSINT Tool
RUN git clone https://github.com/Hamed233/Digital-Footprint-OSINT-Tool.git . && \
    pip install --no-cache-dir -r requirements.txt

# Create results directory
RUN mkdir -p /results

# Set the entrypoint to python with the main script
ENTRYPOINT ["python", "digital_footprint.py"]
