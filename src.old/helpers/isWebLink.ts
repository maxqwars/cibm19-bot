export function isWebLink(link: string): boolean {
  const expression =
    /https?:\/\/(www\.)?[m.vk|vk:ok@:%._\+~#=]{1,256}\.[com|ru]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
  return expression.exec(link) !== null ? true : false;
}
