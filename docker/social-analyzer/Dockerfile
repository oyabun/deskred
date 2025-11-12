FROM python:3.11-slim

# Install dependencies
RUN apt-get update && apt-get install -y \
    git \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Clone and install Social Analyzer
WORKDIR /opt
RUN git clone https://github.com/qeeqbox/social-analyzer.git
WORKDIR /opt/social-analyzer
RUN pip install --no-cache-dir -r requirements.txt

# Create results directory
RUN mkdir -p /results

WORKDIR /opt/social-analyzer

ENTRYPOINT ["python", "app.py"]
