# Manual de Pruebas - Lógica de Equipamiento (Actualizado Completo)

## 🎯 Objetivo
Verificar que todas las validaciones de equipamiento funcionen correctamente en la interfaz web.

## 🌐 Acceso
Abrir: http://localhost:3001/builder

## 🧪 Casos de Prueba

### 1. Anillos del Mismo Tipo (POR NOMBRE BASE)

#### ✅ Caso 1.1: Anillos de Diferente Tipo (DEBE PERMITIR)
1. **Seleccionar slot `ring_left`**
2. **Buscar "Anillo de Rushu"**
3. **Equipar "Anillo de Rushu"**
4. **Seleccionar slot `ring_right`**
5. **Buscar "Anillo de tofu"**
6. **Intentar equipar**

**Resultado esperado**: ✅ Debe permitir equipar (nombres base diferentes)

#### ❌ Caso 1.2: Anillos del Mismo Tipo (DEBE BLOQUEAR)
1. **Seleccionar slot `ring_left`**
2. **Buscar "Anillo de Rushu"**
3. **Equipar "Anillo de Rushu" (cualquier rareza)**
4. **Seleccionar slot `ring_right`**
5. **Buscar otra versión de "Anillo de Rushu"** (ej: legendario, mítico)
6. **Intentar equipar**

**Resultado esperado**: ❌ Debe mostrar error "Anillos del mismo tipo no permitidos"

#### 📋 Ejemplos de Anillos del Mismo Tipo
- **"Anillo de Rushu"** (mítico) ❌ con **"Anillo de Rushu"** (legendario)
- **"Anillo de tofu"** (común) ❌ con **"Anillo de tofu"** (raro)
- **"Anillo del taller"** (raro) ❌ con **"Anillo del taller"** (mítico)
- **"Anillo de Jack"** (raro) ❌ con **"Anillo de Jack"** (mítico)

### 2. Armas de Dos Manos

#### ✅ Caso 2.1: Arma de Dos Manos Sola (DEBE PERMITIR)
1. **Seleccionar slot `main_hand`**
2. **Buscar hacha, martillo o arco** (tipos 101, 114, 117)
3. **Equipar cualquier arma**

**Resultado esperado**: ✅ Debe permitir equipar

#### ❌ Caso 2.2: Arma de Dos Manos + Secundaria (DEBE BLOQUEAR)
1. **Equipar un arma de dos manos** en `main_hand`
2. **Seleccionar slot `off_hand`**
3. **Buscar cualquier arma o escudo**
4. **Intentar equipar**

**Resultado esperado**: ❌ Debe mostrar error "Arma de dos manos equipada - slot secundario bloqueado"

#### ✅ Caso 2.3: Arma de Una Mano + Secundaria (DEBE PERMITIR)
1. **Seleccionar slot `main_hand`**
2. **Buscar espada o varita** (tipos 110, 120)
3. **Equipar arma de una mano**
4. **Seleccionar slot `off_hand`**
5. **Buscar cualquier arma/escudo**
6. **Equipar**

**Resultado esperado**: ✅ Debe permitir ambos items

### 3. Items con Condiciones Especiales (NUEVAS)

#### ❌ Caso 3.1: Múltiples Items con Ranura Épica (DEBE BLOQUEAR)
1. **Equipar "Anillo de Amakna"** (propiedades: [12, 19])
2. **Intentar equipar otro item con propiedad 19**

**Resultado esperado**: ❌ "Solo 1 item con ranura épica"

#### ❌ Caso 3.2: Múltiples Items con Ranura Reliquia (DEBE BLOQUEAR)
1. **Equipar "Espada de Amakna"** (propiedades: [8, 20])
2. **Intentar equipar otro item con propiedad 20**

**Resultado esperado**: ❌ "Solo 1 item con ranura reliquia"

#### ❌ Caso 3.3: Condiciones Dependientes (DEBE BLOQUEAR)
1. **Intentar equipar "Espada de Amakna"** sin "Anillo de Amakna"
2. **Intentar equipar "Bahía de Sufokia"** sin "Anillo de Sufokia"

**Resultado esperado**: ⚠️ Mensaje en descripción indica dependencia

### 4. Validaciones Existentes

#### ❌ Caso 4.1: Múltiples Reliquias (DEBE BLOQUEAR)
1. **Equipar una reliquia** (propiedad 8, rareza 5)
2. **Intentar equipar otra reliquia**

**Resultado esperado**: ❌ "Solo 1 reliquia equipada"

#### ❌ Caso 4.2: Múltiples Épicos (DEBE BLOQUEAR)
1. **Equipar un épico** (propiedad 12, rareza 7)
2. **Intentar equipar otro épico**

**Resultado esperado**: ❌ "Solo 1 epico equipado"

### 5. Items Específicos Encontrados

#### 📋 Items con Propiedad 19 (EPIC_GEMMABLE)
| Item | Nivel | Propiedades | Descripción |
|------|-------|-------------|-------------|
| Anillo de Amakna | 200 | [12, 19] | Permite equipar espada de Amakna |
| Anillo de Sufokia | 200 | [12, 19] | Permite equipar mística espada de Sufokia |
| Anillo de Bonta | 200 | [12, 19] | Permite equipar noble espada de Bonta |
| Anillo de Brakmar | 200 | [12, 19] | Permite equipar traicionera espada de Brakmar |

#### 📋 Items con Propiedad 20 (RELIC_GEMMABLE)
| Item | Nivel | Propiedades | Descripción |
|------|-------|-------------|-------------|
| Espada de Amakna | 200 | [8, 20] | Requiere anillo de Amakna |
| Bahía de Sufokia | 200 | [8, 20] | Requiere anillo de Sufokia |
| Espada de Bonta | 200 | [8, 20] | Requiere anillo de Bonta |
| Espada de Brakmar | 200 | [8, 20] | Requiere anillo de Brakmar |
| Espada eterna | 200 | [8, 20] | Item final de la saga |

### 6. Importación de Builds

#### ✅ Caso 6.1: Build Válido (DEBE IMPORTAR CORRECTAMENTE)
1. **Crear JSON con items válidos**
2. **Usar "Importar JSON"**
3. **Verificar que se asignen correctamente**

#### ❌ Caso 6.2: Build Inválido (DEBE FILTRAR)
1. **Crear JSON con 2 anillos del mismo nombre base**
2. **Importar**
3. **Verificar que solo se importe uno**

## 🔍 Indicadores Visuales

### Slots Inválidos
- **Color rojo/advertencia** en slots con problemas
- **Mensaje de error** específico debajo del slot
- **Botón "Equipar" deshabilitado** en catálogo

### Mensajes de Error Esperados
- `"Anillos del mismo tipo no permitidos"`
- `"Arma de dos manos equipada - slot secundario bloqueado"`
- `"Solo 1 reliquia equipada"`
- `"Solo 1 epico equipado"`
- `"Solo 1 item con ranura épica"`
- `"Solo 1 item con ranura reliquia"`

## 📊 Propiedades Especiales Detectadas

### Propiedades Exclusivas
| ID | Nombre | Descripción | Items Encontrados |
|----|--------|-------------|-------------------|
| 8 | EXCLUSIVE_EQUIPMENT_ITEM | Solo 1 reliquia equipada | 97 items |
| 12 | EXCLUSIVE_EQUIPMENT_ITEM_2 | Solo 1 epico equipado | 115 items |
| 19 | EPIC_GEMMABLE | Solo 1 item con ranura épica | 4 items |
| 20 | RELIC_GEMMABLE | Solo 1 item con ranura reliquia | 5 items |

### Propiedades Informativas
| ID | Nombre | Descripción |
|----|--------|-------------|
| 1 | TREASURE | Objeto tesoro (interface especial) |
| 7 | SHOP_ITEM | Item solo disponible en tienda |
| 13 | NOT_RECYCLABLE | No se puede reciclar |
| 23 | EXCLUDE_FROM_LISTS | Excluido de listas automáticas |
| 24 | EXCLUDE_FROM_ENCYCLOPEDIA | Excluido de enciclopedia |

## ⚔️ Tipos de Arma

### Armas de Dos Manos
- **Hachas** (Tipo 101): Hacha del jefe de guerra
- **Martillos** (Tipo 114): Jalamartillo
- **Arcos** (Tipo 117): Arco Desade
- **Espadas 2M** (Tipo 223): Espada Mento

### Armas de Una Mano
- **Espadas** (Tipo 110): Espada de tofu
- **Varitas** (Tipo 120): Jalavarita

## ✅ Checklist de Verificación

- [ ] Anillos mismo nombre base muestran error
- [ ] Anillos diferente nombre base se equipan
- [ ] Armas 2 manos se detectan correctamente
- [ ] Slot secundario se bloquea con arma 2 manos
- [ ] Armas 1 mano permiten item secundario
- [ ] Reliquias/épicos mantienen validación
- [ ] Items con ranura épica muestran error
- [ ] Items con ranura reliquia muestran error
- [ ] Importación filtra builds inválidos
- [ ] Mensajes de error son claros
- [ ] UI indica slots bloqueados visualmente

## 🐛 Problemas Conocidos

Si encuentras algún problema:
1. **Recargar la página** y probar de nuevo
2. **Verificar consola del navegador** para errores
3. **Revisar que los servidores estén corriendo** (backend:4000, frontend:3001)

## 📝 Notas Importantes

### Cambios Recientes
1. **Validación por nombre base**: Los anillos del mismo tipo no pueden equiparse juntos
2. **Nuevas propiedades exclusivas**: 
   - Propiedad 19: Items con ranura épica
   - Propiedad 20: Items con ranura reliquia
3. **Condiciones dependientes**: Algunos items requieren otros items para funcionar

### Lógica de Nombres Base
El sistema extrae el nombre base eliminando:
- Palabras de rareza (legendario, mítico, épico, reliquia, etc.)
- Variaciones de idioma (español, inglés, francés, portugués)
- Mantiene el nombre fundamental del item

### Items Especiales
Los siguientes items tienen condiciones especiales:
- **Anillos de Amakna/Sufokia/Bonta/Brakmar**: Permiten equipar armas específicas
- **Espadas de Amakna/Sufokia/Bonta/Brakmar**: Requieren sus anillos correspondientes
- **Espada eterna**: Item final con propiedad 20

### Compatibilidad
- Las validaciones solo aplican al equipar nuevos items
- Los builds existentes no se rompen
- La importación aplica las mismas reglas que el equipamiento manual
- Los mensajes son específicos para facilitar la corrección
