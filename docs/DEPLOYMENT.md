# 🚀 LLMMux Deployment Guide

<div align="center">
  <img src="../assets/llmmux-logo.png" alt="LLMMux Logo" width="120" height="120">
  <h1>Production Deployment Guide</h1>
</div>

This guide covers production deployment scenarios for LLMMux with proper branding and configuration.

## 🐳 Docker Hub Deployment

### Official Images
```bash
# Latest stable release
docker pull ralmalki/llmmux:latest

# Specific version
docker pull ralmalki/llmmux:v1.1.0

# Development builds
docker pull ralmalki/llmmux:dev
```

### Quick Start
```bash
docker run -d \
  --name llmmux \
  -p 8080:8080 \
  -e API_KEYS="your-secret-api-key" \
  -e VLLM_SERVERS="your-vllm-server:8000" \
  --restart unless-stopped \
  ralmalki/llmmux:latest
```

## ☸️ Kubernetes Deployment

### Namespace and ConfigMap
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: llmmux
  labels:
    app.kubernetes.io/name: llmmux
    app.kubernetes.io/version: "1.1.0"
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: llmmux-config
  namespace: llmmux
data:
  NODE_ENV: "production"
  PORT: "8080"
  ENABLE_CORS: "true"
  CORS_ORIGIN: "*"
  HEALTH_CHECK_INTERVAL: "30000"
```

### Deployment with Health Checks
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: llmmux
  namespace: llmmux
  labels:
    app: llmmux
    version: v1.1.0
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: llmmux
  template:
    metadata:
      labels:
        app: llmmux
        version: v1.1.0
    spec:
      containers:
      - name: llmmux
        image: ralmalki/llmmux:v1.1.0
        ports:
        - containerPort: 8080
          name: http
        envFrom:
        - configMapRef:
            name: llmmux-config
        env:
        - name: API_KEYS
          valueFrom:
            secretKeyRef:
              name: llmmux-secrets
              key: api-keys
        - name: VLLM_SERVERS
          value: "vllm-service-1:8000,vllm-service-2:8001"
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2
```

## 🔧 Production Configuration

### Environment Variables
```bash
# Core Configuration
NODE_ENV=production
PORT=8080

# Authentication
API_KEYS=sk-prod-key-1,sk-prod-key-2,sk-admin-key

# Backend Discovery (Recommended)
VLLM_SERVERS=vllm-cluster-1:8000,vllm-cluster-2:8001,vllm-cluster-3:8002

# Alternative: Manual Configuration
# BACKENDS=qwen-72b:vllm-1:8000,llama-70b:vllm-2:8001,mixtral-8x7b:vllm-3:8002

# Security & CORS
ENABLE_CORS=true
CORS_ORIGIN=https://yourdomain.com,https://admin.yourdomain.com

# Monitoring
HEALTH_CHECK_INTERVAL=30000
LOG_LEVEL=info
```

### Secrets Management
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: llmmux-secrets
  namespace: llmmux
type: Opaque
stringData:
  api-keys: "sk-prod-key-1,sk-prod-key-2,sk-admin-key"
```

## 🔍 Monitoring & Observability

### Health Check Endpoints
- `GET /healthz` - Overall system health
- `GET /v1/models/discovery/stats` - Model discovery statistics

### Logging Configuration
```yaml
env:
- name: LOG_FORMAT
  value: "json"
- name: LOG_LEVEL
  value: "info"
```

### Prometheus Metrics (Future)
```yaml
# Planned monitoring endpoints
# GET /metrics - Prometheus metrics
# - request_duration_seconds
# - backend_health_status
# - active_connections
# - discovery_attempts_total
```

## 🌐 Load Balancing

### NGINX Configuration
```nginx
upstream llmmux_backend {
    server llmmux-1:8080;
    server llmmux-2:8080;
    server llmmux-3:8080;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;
    
    # SSL configuration
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://llmmux_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support for streaming
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    location /healthz {
        proxy_pass http://llmmux_backend;
        access_log off;
    }
}
```

## 🔐 Security Best Practices

### Container Security
```dockerfile
# Use non-root user (already implemented)
USER node

# Read-only root filesystem
securityContext:
  readOnlyRootFilesystem: true
  runAsNonRoot: true
  runAsUser: 1000
```

### Network Policies
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: llmmux-network-policy
  namespace: llmmux
spec:
  podSelector:
    matchLabels:
      app: llmmux
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 8080
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: vllm
    ports:
    - protocol: TCP
      port: 8000
```

## 📊 Performance Tuning

### Resource Allocation
```yaml
resources:
  requests:
    memory: "512Mi"    # Minimum for production
    cpu: "200m"        # 0.2 CPU cores
  limits:
    memory: "1Gi"      # Maximum memory usage
    cpu: "1000m"       # 1 CPU core limit
```

### Horizontal Pod Autoscaler
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: llmmux-hpa
  namespace: llmmux
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: llmmux
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## 🚀 CI/CD Integration

See `.github/workflows/release.yml` for automated Docker builds and releases.

---

<div align="center">
  <p><strong>LLMMux</strong> - Production-Ready LLM Multiplexer</p>
  <p>🧠 Intelligent • 🔗 Compatible • 🛡️ Secure • 📈 Scalable</p>
</div>
