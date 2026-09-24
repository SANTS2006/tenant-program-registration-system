export { code128 } from "./barcode.js";
export {
  ID_CARD_DESIGNS,
  ID_CARD_DESIGN_IDS,
  ID_CARD_HEIGHT,
  ID_CARD_WIDTH,
  idCardDesign,
  renderIdCard,
  type DesignColors,
  type IdCardContent,
} from "./idCards.js";
export {
  TICKET_DESIGNS,
  TICKET_DESIGN_IDS,
  TICKET_HEIGHT,
  TICKET_WIDTH,
  renderTicket,
  ticketDesign,
  type TicketContent,
} from "./tickets.js";
export { sampleQrMatrix } from "./svg.js";

export const DEFAULT_ID_CARD_TERMS = [
  "This card remains the property of the issuing organization and must be returned on request.",
  "Carry this card at all program activities and present it when asked.",
  "If found, please return it to the organization or scan the QR code to verify it.",
];
