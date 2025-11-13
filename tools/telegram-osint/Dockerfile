FROM python:3.11-slim

WORKDIR /app

# Install dependencies
RUN apt-get update && apt-get install -y \
    git \
    && rm -rf /var/lib/apt/lists/*

# Clone telegram-username-checker or similar tool
RUN git clone https://github.com/bellingcat/octosuite.git .

# Install Python requirements
RUN pip install --no-cache-dir telethon python-dotenv

# Create results directory
RUN mkdir -p /results

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["--help"]
