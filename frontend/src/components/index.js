/**
 * Exporta todos os componentes do sistema
 * Facilita importação: import { Button, Loading, CabecalhoPagina } from '../components';
 */

// Componentes UI base
export { Button, Input, Modal, Table } from "./ui";

// Componentes de layout
export { default as CabecalhoPagina } from "./CabecalhoPagina";
export { default as LayoutWithSidebar } from "./LayoutWithSidebar";
export { default as SidebarMenu } from "./SidebarMenu";
export { default as ProfileMenu } from "./ProfileMenu";

// Componentes compartilhados
export { default as Loading } from "./Loading";
export { default as ConfigModal } from "./ConfigModal";
export { default as VisitorCard } from "./VisitorCard";
export { default as VisitAuthorizationModal } from "./VisitAuthorizationModal";
export { default as SwitchToggle } from "./SwitchToggle";
