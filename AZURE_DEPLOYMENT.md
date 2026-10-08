# Azure Cloud Deployment Guide: FaceAttend AI

This guide provides end-to-end instructions for deploying the **FaceAttend AI** platform to Microsoft Azure using enterprise-grade cloud-native architecture.

---

## 1. Cloud Architecture Overview

```
[Users / Browsers]
        │
        ├── HTTPS (Port 443)
        ▼
┌────────────────────────────────────────────────────────┐
│  Azure Static Web Apps (or Azure App Service)          │
│  - React 18 + Vite Production Build (SPA)              │
│  - Global CDN edge caching                             │
│  - Automatic SSL/TLS certificates                      │
└───────────────────────┬────────────────────────────────┘
                        │
                        │ /api/* Reverse Proxy / CORS
                        ▼
┌────────────────────────────────────────────────────────┐
│  Azure Container Apps (or Azure App Service Linux)     │
│  - FastAPI Python 3.11 Container                       │
│  - Automatic horizontal autoscaling (0 to N replicas)  │
│  - Internal Ingress & Managed Identity                 │
│  - Built-in OpenCV inference & LangChain RAG pipeline   │
└───────────────────────┬────────────────────────────────┘
                        │
                        ├── TLS encrypted PostgreSQL (Port 5432)
                        ▼
┌────────────────────────────────────────────────────────┐
│  Azure Database for PostgreSQL - Flexible Server       │
│  - Managed high availability & automated backups       │
│  - Private VNet integration & SSL enforced             │
└────────────────────────────────────────────────────────┘
```

---

## 2. Prerequisites

1. An active Azure subscription.
2. [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli) installed (`az --version`).
3. Logged in to your Azure account:
   ```bash
   az login
   ```

---

## 3. Step-by-Step Deployment

### Step 1: Create Resource Group & Azure Container Registry (ACR)

```bash
# Variables
RESOURCE_GROUP="rg-faceattend-prod"
LOCATION="eastus"
ACR_NAME="acrfaceattendprod"

# 1. Create Resource Group
az group create --name $RESOURCE_GROUP --location $LOCATION

# 2. Create Azure Container Registry
az acr create --resource-group $RESOURCE_GROUP \
  --name $ACR_NAME \
  --sku Basic \
  --admin-enabled true
```

### Step 2: Provision Azure Database for PostgreSQL (Flexible Server)

```bash
DB_SERVER_NAME="psql-faceattend-prod"
DB_ADMIN="faceattend_admin"
DB_PASS="YourSecureP@ssw0rd123!"

az postgres flexible-server create \
  --resource-group $RESOURCE_GROUP \
  --name $DB_SERVER_NAME \
  --location $LOCATION \
  --admin-user $DB_ADMIN \
  --admin-password $DB_PASS \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 16 \
  --public-access 0.0.0.0

# Create the application database
az postgres flexible-server db create \
  --resource-group $RESOURCE_GROUP \
  --server-name $DB_SERVER_NAME \
  --database-name faceattend_db
```

### Step 3: Build & Push Backend Container to ACR

```bash
# Login to ACR
az acr login --name $ACR_NAME

# Build and push backend image
docker build -t $ACR_NAME.azurecr.io/faceattend-backend:latest ./backend
docker push $ACR_NAME.azurecr.io/faceattend-backend:latest
```

### Step 4: Deploy Backend to Azure Container Apps

```bash
# Create Log Analytics Workspace and Container App Environment
az containerapp env create \
  --name env-faceattend-prod \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION

# Get ACR credentials
ACR_PASSWORD=$(az acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv)

# Construct PostgreSQL Connection String
DATABASE_URL="postgresql://${DB_ADMIN}:${DB_PASS}@${DB_SERVER_NAME}.postgres.database.azure.com:5432/faceattend_db?sslmode=require"

# Deploy Container App
az containerapp create \
  --name app-faceattend-backend \
  --resource-group $RESOURCE_GROUP \
  --environment env-faceattend-prod \
  --image $ACR_NAME.azurecr.io/faceattend-backend:latest \
  --target-port 8000 \
  --ingress external \
  --registry-server $ACR_NAME.azurecr.io \
  --registry-username $ACR_NAME \
  --registry-password $ACR_PASSWORD \
  --cpu 1.0 --memory 2.0Gi \
  --env-vars \
    ENVIRONMENT=production \
    DEBUG=False \
    DATABASE_URL="$DATABASE_URL" \
    JWT_SECRET="YOUR_RANDOM_LONG_SECRET_KEY_HERE" \
    FACE_MATCH_THRESHOLD="0.65" \
    ATTENDANCE_COOLDOWN_SECONDS="60" \
    WORK_START_TIME="09:30" \
    WORK_END_TIME="17:00" \
    CORS_ORIGINS="*"
```

Get your backend URL:
```bash
BACKEND_URL=$(az containerapp show --name app-faceattend-backend --resource-group $RESOURCE_GROUP --query "properties.configuration.ingress.fqdn" -o tsv)
echo "Backend URL: https://$BACKEND_URL"
```

### Step 5: Deploy Frontend to Azure Static Web Apps

```bash
# Install Azure Static Web Apps CLI
npm install -g @azure/static-web-apps-cli

# Build frontend targeting the production backend URL
cd frontend
npm run build

# Deploy to Azure Static Web Apps
az staticwebapp create \
  --name app-faceattend-frontend \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --source ./dist
```

---

## 4. Production Security Recommendations

1. **Managed Identities**: Use Azure Managed Identity instead of database password credentials in Container Apps.
2. **Azure Key Vault**: Store `JWT_SECRET`, database passwords, and optional `OPENAI_API_KEY` in Azure Key Vault and reference them directly as Key Vault secrets in Container Apps.
3. **Network Isolation**: Restrict PostgreSQL Flexible Server to Azure Private Endpoints within a virtual network (`VNet`).
4. **WAF & DDoS**: Put Azure Front Door with Web Application Firewall (WAF) in front of the Static Web App and Container App.
