FROM python:3.11-slim

WORKDIR /app

# Install dependencies
RUN pip install --no-cache-dir telethon python-dotenv

# Create results directory
RUN mkdir -p /results

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["--help"]
