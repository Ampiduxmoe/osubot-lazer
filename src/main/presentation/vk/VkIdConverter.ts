export class VkIdConverter {
  static isVkId(appUserId: string): boolean {
    return appUserId.startsWith('vk:');
  }
  static vkUserIdToAppUserId(vkId: number): string {
    return `vk:${vkId}`;
  }
  static appUserIdToVkUserId(appUserId: string): number {
    return parseInt(appUserId.replace('vk:', ''));
  }
}
