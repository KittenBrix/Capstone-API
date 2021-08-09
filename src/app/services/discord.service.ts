import * as discord from 'discord.js';


export class DiscordService {
    static client: discord.Client = new discord.Client();
    static __loaded: boolean = false;
    static async load(): Promise<boolean>{
        if (this.__loaded){return false;}
        // attach DiscordInternals methods to our lovely client. :)
        this.client.once('ready', DiscordInternals.ready);
        // attach other methods
        // this.client.on => event methods
        this.client.on('interactionCreate', DiscordInternals.slashCommands)
        // login to our baby bot
        this.client.login(process.env.D_BOT_TOKEN);
    }
    static async checkUserStatus(discordUserId: string): Promise<any>{
        await this.load();
        const me = this.client;
        // determine current state of discordUserId.
    }
}

// all websocket events the discord client must respond to should be defined within here.
class DiscordInternals{
    static slashCommandList: any = {
        'ping': DiscordInternals.ping,
        'beep': DiscordInternals.beep,
    };
    // method to call once the client discord service is ready to use.
    static ready(){
        console.log("discord websocket api ready!");
    }
    // handle all slash commands here
    static async slashCommands(interaction:any): Promise<any>{
        // note, interaction refers to https://discord.js.org/#/docs/main/master/class/Interaction
        if (!interaction.isCommand()) return;
        const { commandName: command } = interaction;
        return await this.slashCommandList[command](interaction);
    }
    // add some slash commands.
    static async ping(interaction:any){
        await interaction.reply("🏓 pong!");
    }
    static async beep(interaction:any){
        await interaction.reply("🤖 boop!");
    }
}