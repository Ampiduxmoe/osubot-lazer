export class VkIdConverter {
  static vkUserIdToAppUserId(vkId: number): string {
    return `vk:${vkId}`;
  }
  static appUserIdToVkUserId(appUserId: string): number {
    return parseInt(appUserId.replace('vk:', ''));
  }
}
