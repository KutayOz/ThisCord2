import { useEffect, useState } from 'react';
import { ServerSidebar } from '../components/layout/ServerSidebar';
import { ChannelSidebar } from '../components/layout/ChannelSidebar';
import { ChatArea } from '../components/chat/ChatArea';
import { DmArea } from '../components/dm/DmArea';
import { VoiceChannelArea } from '../components/voice/VoiceChannelArea';
import { MemberSidebar } from '../components/layout/MemberSidebar';
import { CreateServerModal } from '../components/modals/CreateServerModal';
import { JoinServerModal } from '../components/modals/JoinServerModal';
import { useAppStore } from '../stores/appStore';
import { initDmService } from '../services/dmService';
import { DmIncomingRequestModal } from '../components/dm/DmIncomingRequestModal';
import { ChannelType } from '../types';

export function MainApp() {
  const [showMembers, setShowMembers] = useState(true);
  const { selectedServerId, selectedChannelId, channels } = useAppStore();

  const selectedChannel = channels.find((c) => c.id === selectedChannelId);
  const isVoiceChannel = selectedChannel?.type === ChannelType.Voice;

  useEffect(() => {
    initDmService().catch(() => {
    });
  }, []);

  return (
    <div className="h-screen flex overflow-hidden">
      <ServerSidebar />
      <ChannelSidebar />
      {selectedServerId ? (
        <>
          {isVoiceChannel && selectedChannel ? (
            <VoiceChannelArea channelId={selectedChannel.id} channelName={selectedChannel.name} />
          ) : (
            <ChatArea
              showMembers={showMembers}
              onToggleMembers={() => setShowMembers(!showMembers)}
            />
          )}
          {!isVoiceChannel && showMembers && <MemberSidebar />}
        </>
      ) : (
        <DmArea />
      )}
      
      {/* Modals */}
      <CreateServerModal />
      <JoinServerModal />
      <DmIncomingRequestModal />
    </div>
  );
}
