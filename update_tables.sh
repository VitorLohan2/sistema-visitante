#!/bin/bash

# Script para atualizar todas as referências das tabelas antigas para as novas

echo "🔄 Iniciando migração das referências de tabelas..."

# Diretório dos controllers
CONTROLLERS_DIR="backend/src/controllers"

# Lista de arquivos para atualizar
files=(
    "AgendamentoController.js"
    "ChatController.js"
    "FuncionarioController.js"
    "IncidentController.js"
    "PontoUsuarioController.js"
    "RegistroFuncionarioController.js"
    "TicketController.js"
    "HistoryController.js"
    "VisitorController.js"
    "ProfileController.js"
    "CodigoController.js"
    "ResponsavelController.js"
)

echo "📝 Atualizando referências de tabela 'ongs' para 'usuarios'..."
for file in "${files[@]}"; do
    if [ -f "$CONTROLLERS_DIR/$file" ]; then
        echo "  ✅ Atualizando $file"
        sed -i 's/connection("ongs")/connection("usuarios")/g' "$CONTROLLERS_DIR/$file"
        sed -i "s/connection('ongs')/connection('usuarios')/g" "$CONTROLLERS_DIR/$file"
    else
        echo "  ⚠️  Arquivo não encontrado: $file"
    fi
done

echo "📝 Atualizando referências de tabela 'incidents' para 'cadastro_visitantes'..."
for file in "${files[@]}"; do
    if [ -f "$CONTROLLERS_DIR/$file" ]; then
        echo "  ✅ Atualizando $file (incidents)"
        sed -i 's/connection("incidents")/connection("cadastro_visitantes")/g' "$CONTROLLERS_DIR/$file"
        sed -i "s/connection('incidents')/connection('cadastro_visitantes')/g" "$CONTROLLERS_DIR/$file"
        
        # Atualizar referências em JOINs e FROMs
        sed -i 's/"incidents"/"cadastro_visitantes"/g' "$CONTROLLERS_DIR/$file"
        sed -i "s/'incidents'/'cadastro_visitantes'/g" "$CONTROLLERS_DIR/$file"
    fi
done

echo "📝 Atualizando referências de 'ong_id' para 'usuario_id'..."
for file in "${files[@]}"; do
    if [ -f "$CONTROLLERS_DIR/$file" ]; then
        echo "  ✅ Atualizando $file (ong_id)"
        sed -i 's/ong_id/usuario_id/g' "$CONTROLLERS_DIR/$file"
    fi
done

# Atualizar também nos módulos
echo "📝 Atualizando módulos..."
if [ -d "backend/src/module" ]; then
    find backend/src/module -name "*.js" -exec sed -i 's/connection("ongs")/connection("usuarios")/g' {} \;
    find backend/src/module -name "*.js" -exec sed -i "s/connection('ongs')/connection('usuarios')/g" {} \;
    find backend/src/module -name "*.js" -exec sed -i 's/connection("incidents")/connection("cadastro_visitantes")/g' {} \;
    find backend/src/module -name "*.js" -exec sed -i "s/connection('incidents')/connection('cadastro_visitantes')/g" {} \;
    find backend/src/module -name "*.js" -exec sed -i 's/ong_id/usuario_id/g' {} \;
fi

echo "✅ Migração concluída!"