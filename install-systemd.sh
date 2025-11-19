#!/bin/bash
# Script para instalar el servicio systemd de DESKRED

echo "🔧 Instalando servicio systemd para DESKRED..."

# Copiar el archivo de servicio
sudo cp deskred.service /etc/systemd/system/

# Recargar systemd
sudo systemctl daemon-reload

# Habilitar el servicio para que inicie al arrancar
sudo systemctl enable deskred.service

# Iniciar el servicio ahora
sudo systemctl start deskred.service

echo ""
echo "✅ Servicio instalado!"
echo ""
echo "📋 Comandos útiles:"
echo "  sudo systemctl status deskred    # Ver estado"
echo "  sudo systemctl start deskred     # Iniciar"
echo "  sudo systemctl stop deskred      # Detener"
echo "  sudo systemctl restart deskred   # Reiniciar"
echo "  sudo journalctl -u deskred -f    # Ver logs en tiempo real"
echo ""
