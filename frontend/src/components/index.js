/**
 * Exporta todos os componentes do sistema
 * Facilita importação: import { Button, Loading } from '../components';
 */

// Componentes UI base
export { Button, Input, Modal, Table } from "./ui";

// Componentes de layout
export { default as MenuDaBarraLateral } from "./MenuDaBarraLateral";

// Componentes compartilhados
export { default as Loading } from "./Loading";
export { default as CardDeListagemVisitante } from "./CardDeListagemVisitante";
export { default as ModalRegistrarVisita } from "./ModalRegistrarVisita";
