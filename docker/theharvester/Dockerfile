FROM python:3.12-slim

# Install dependencies
RUN apt-get update && apt-get install -y \
    git \
    && rm -rf /var/lib/apt/lists/*

# Clone and install theHarvester
WORKDIR /opt
RUN git clone https://github.com/laramies/theHarvester.git
WORKDIR /opt/theHarvester

# Install requirements - try different possible locations
RUN if [ -f requirements.txt ]; then \
        pip install --no-cache-dir -r requirements.txt; \
    elif [ -f requirements/base.txt ]; then \
        pip install --no-cache-dir -r requirements/base.txt; \
    else \
        pip install --no-cache-dir -e .; \
    fi

# Create results directory
RUN mkdir -p /results

WORKDIR /opt/theHarvester

ENTRYPOINT ["python", "theHarvester.py"]
