# GastroPOS — Sistema de Gestión Gastronómica

## Requisitos previos

- Python 3.11+
- Node.js 20+
- PostgreSQL 14+

---

## 1. Configurar la base de datos

Crear la base de datos en PostgreSQL (con pgAdmin o psql):

```sql
CREATE DATABASE gastro_db;
```

---

## 2. Configurar el backend

```bash
cd backend

# Crear y activar el entorno virtual
python -m venv venv
venv\Scripts\activate   # Windows

# Instalar dependencias
pip install -r requirements.txt

# Copiar y editar el archivo de configuración
copy .env.example .env
# Editar .env y cambiar la contraseña de PostgreSQL en DATABASE_URL
```

Ejemplo de `.env`:
```
DATABASE_URL=postgresql+asyncpg://postgres:TU_CONTRASEÑA@localhost:5432/gastro_db
SECRET_KEY=3f7a2c9e1b4d6f8a0c2e5g7i9k1m3o5q7s9u1w3y5a7c9e1b4d6f8a0c2e5g7i
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_HOURS=8
CORS_ORIGINS=["http://localhost:5173"]
```

---

## 3. Ejecutar migraciones y seed

```bash
# Dentro de backend/ con el venv activado

# Crear las tablas en la base de datos
alembic upgrade head

# Poblar con datos iniciales (mesas, menú, usuarios)
python seed.py
```

Usuarios creados por el seed:
| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| admin | admin123 | Administrador |
| mozo1 | mozo123 | Mozo |
| cajero1 | caja123 | Cajero |
| cocina1 | cocina123 | Cocina |

---

## 4. Iniciar el backend

```bash
# Dentro de backend/ con el venv activado
python run.py
# → API corriendo en http://localhost:8000
# → Documentación en http://localhost:8000/docs
```

---

## 5. Iniciar el frontend

```bash
# En una nueva terminal
cd frontend
npm install
npm run dev
# → App corriendo en http://localhost:5173
```

---

## Acceso desde la red local (tablets/celulares)

1. Encontrá la IP de tu PC: ejecutá `ipconfig` y buscá la dirección `192.168.x.x`
2. Editá el `.env` del backend:
   ```
   CORS_ORIGINS=["http://localhost:5173","http://192.168.x.x:5173"]
   ```
3. Accedé desde cualquier dispositivo en la misma WiFi: `http://192.168.x.x:5173`

---

## Estructura del proyecto

```
software_gastroeconomico/
├── backend/          # FastAPI + PostgreSQL
│   ├── app/          # Código principal
│   ├── alembic/      # Migraciones de base de datos
│   ├── seed.py       # Datos iniciales
│   └── run.py        # Arrancar el servidor
└── frontend/         # React + Vite + Tailwind
    └── src/
        ├── pages/    # Páginas de la aplicación
        ├── api/      # Funciones de API
        └── contexts/ # Estado global (auth)
```

---

## Módulos del sistema

| Módulo | Roles con acceso |
|--------|-----------------|
| Dashboard (KPIs y reportes) | Admin |
| Mapa de mesas | Admin, Mozo, Cajero |
| Reservas | Admin, Mozo, Cajero |
| Toma de pedidos | Admin, Mozo |
| Pantalla de cocina | Admin, Cocina |
| Caja / Cobrar | Admin, Cajero |
| Gestión de menú | Admin |
| Egresos | Admin |
| Reportes detallados | Admin |
