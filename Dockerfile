# Use Node.js 18 LTS
FROM node:18-alpine

# Set Working Directory
WORKDIR /app

# Copy Package definitions
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install production dependencies
RUN npm install --prefix backend --production && npm install --production

# Copy Application Source
COPY . .

# Expose Port
EXPOSE 3000

# Set Environment Variables
ENV PORT=3000
ENV NODE_ENV=production

# Start Node Server
CMD ["node", "backend/server.js"]
