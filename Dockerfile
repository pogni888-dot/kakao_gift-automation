# Use the official Playwright image which includes Node.js and verified browsers
FROM mcr.microsoft.com/playwright:v1.56.1-jammy



# Set working directory to app root
WORKDIR /app

# --- Flattened Setup ---
WORKDIR /app

# Copy root and dashboard package files
COPY package*.json ./
COPY dashboard/package*.json ./dashboard/

# Install dependencies
RUN npm install
RUN cd dashboard && npm install

# Copy source code (respects .dockerignore)
COPY . .

# Build frontend
RUN cd dashboard && npm run build

# Expose port
EXPOSE 3001

CMD ["node", "server.js"]
