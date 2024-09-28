
/**
 * @name PinnedDMs
 * @author YourName
 * @version 1.0.0
 * @description A plugin to pin DMs and add custom notifications/ringtones.
 * @source https://github.com/YourGitHubRepoLink
 * @updateUrl https://raw.githubusercontent.com/YourUpdateLink/PinnedDMs.plugin.js
 */

module.exports = class PinnedDMs {
    constructor() {
        // Load data for pinned DMs and custom ringtones
        this.pinnedDMs = BdApi.loadData('PinnedDMs', 'pinnedDMs') || [];
        this.customRingtones = BdApi.loadData('PinnedDMs', 'customRingtones') || {};
    }

    start() {
        // Add Pinned DMs UI to Discord
        this.addPinnedDMsUI();

        // Listen for new messages from pinned DMs
        this.listenForMessages();

        // Show success notification
        BdApi.showToast("PinnedDMs Plugin Started", { type: "success" });
    }

    stop() {
        // Remove the pinned DMs UI when the plugin is stopped
        const pinnedContainer = document.querySelector("#pinned-dms-list");
        if (pinnedContainer) {
            pinnedContainer.remove();
        }
        BdApi.showToast("PinnedDMs Plugin Stopped", { type: "error" });
    }

    // Add the pinned DMs section to the Discord UI
    addPinnedDMsUI() {
        // Create a container for the pinned DMs
        const container = document.createElement("div");
        container.id = "pinned-dms-list";
        container.style.position = "absolute";
        container.style.top = "50px";
        container.style.right = "10px";
        container.style.padding = "10px";
        container.style.backgroundColor = "#2C2F33";
        container.style.borderRadius = "5px";
        container.style.zIndex = "9999"; // Ensures it stays on top

        // Add a title for the section
        const title = document.createElement("h3");
        title.textContent = "Pinned DMs";
        title.style.color = "#fff";
        container.appendChild(title);

        // Display each pinned DM (currently just using placeholder IDs)
        this.pinnedDMs.forEach((dmId) => {
            const dmElement = document.createElement("div");
            dmElement.style.color = "#fff";
            dmElement.textContent = `DM: ${dmId}`; // Placeholder for DM username
            container.appendChild(dmElement);
        });

        // Append the container to the body
        document.body.appendChild(container);
    }

    // Listen for new messages from pinned DMs
    listenForMessages() {
        const Dispatcher = BdApi.findModuleByProps("dispatch", "subscribe");

        Dispatcher.subscribe("MESSAGE_CREATE", (event) => {
            const message = event.message;

            // If the message is from a pinned DM, play the custom ringtone
            if (this.pinnedDMs.includes(message.channel_id)) {
                this.playCustomRingtone(message.author.id);
            }
        });
    }

    // Play the custom ringtone for a user (or default if none set)
    playCustomRingtone(userId) {
        const ringtoneUrl = this.customRingtones[userId] || "default-ringtone.mp3";
        let audio = new Audio(ringtoneUrl);
        audio.play();
    }

    // Add custom ringtone settings to the plugin settings UI (optional, can extend later)
    getSettingsPanel() {
        const panel = document.createElement("div");
        panel.innerHTML = `
            <h3>Pinned DMs Settings</h3>
            <label>Set custom ringtone URL for a pinned user (example: user123):</label><br>
            <input type="text" id="user-id" placeholder="User ID"><br>
            <input type="text" id="ringtone-url" placeholder="Ringtone URL"><br>
            <button id="save-ringtone">Save Ringtone</button>
        `;

        panel.querySelector("#save-ringtone").onclick = () => {
            const userId = panel.querySelector("#user-id").value;
            const ringtoneUrl = panel.querySelector("#ringtone-url").value;

            if (userId && ringtoneUrl) {
                this.customRingtones[userId] = ringtoneUrl;
                BdApi.saveData('PinnedDMs', 'customRingtones', this.customRingtones);
                BdApi.showToast(`Ringtone saved for ${userId}`, { type: "success" });
            }
        };

        return panel;
    }
};
