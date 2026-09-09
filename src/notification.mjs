const MODULE_ID = "lumenn-lightweight";

export const CustomNotification = {
  show({ originalSize, newSize, assetName }) {
    const savedPercent = (
      ((originalSize - newSize) / originalSize) *
      100
    ).toFixed(1);
    const originalKB = (originalSize / 1024).toFixed(1);
    const newKB = (newSize / 1024).toFixed(1);

    // For v1, we use a stylized standard notification. Could be expanded with custom template later.
    const message = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <i class="fas fa-compress-alt" style="font-size: 1.5em; color: #4a9;"></i>
        <div>
          <strong>${assetName} otimizada!</strong><br/>
          ${originalKB}KB &rarr; ${newKB}KB (-${savedPercent}%)
        </div>
      </div>
    `;

    if (ui.notifications) {
      ui.notifications.info(message, { console: false });
    } else {
      console.log(
        `${MODULE_ID} Notification: ${assetName} optimized: ${originalKB}KB -> ${newKB}KB (-${savedPercent}%)`,
      );
    }
  },
};
