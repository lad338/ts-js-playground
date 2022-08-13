<?php
class Server {
  function handle($payload) {
    $json = json_decode($payload);
    foreach($json as $obj) {
      if ($obj->method == 'chatroom.new_message') {
        $this->chatRoom->addMessage($obj->params->message);
      }

      if ($obj->method == 'member.new_member') {
        $this->memberSystem->addMember($obj->params->email, $obj->params->age);
      }
    }
  }

  private $chatRoom;
  private $memberSystem;

  public function setChatRoom($chatroom) {
    $this->chatRoom = $chatroom;
  }

  public function setMemberSystem($memberSystem) {
    $this->memberSystem = $memberSystem;
  }
}

class ChatRoom {
  public function getMessageCount() {
    return count($this->messages);
  }

  private $messages = [];

  public function addMessage($message) {
    $this->messages[] = $message;
  }
}

class MemberSystem {
  public function getAgeByEmail($email) {
    return $this->members[$email];
  }
  public function addMember($email, $age) {
    $this->members[$email]= $age ;
  }

  private $members = array();

}

// Initiate the server
$server = new Server();

// Initiate services
$chatroom = new ChatRoom();
$memberSystem = new MemberSystem();

$server->setChatRoom($chatroom);
$server->setMemberSystem($memberSystem);

/************************************
 * !! DO NOT EDIT CONTENT BELOW !!  *
 ************************************/

// Sending 4 requests at once
// Don't need to support the last request, just ignore it
$server->handle('
[{
    "method": "chatroom.new_message",
    "params": { "message": "Foo" }
  },
  {
    "method": "chatroom.new_message",
    "params": { "message": "Bar" }
  },
  {
    "method": "member.new_member",
    "params": { "email": "jason@example.com", "age": 12 }
  },
  {
    "method": "member.remove_member",
    "params": { "email": "tony@example.com" }
  }
]
');

echo sprintf(
  "Chat room message count: %s (Expected: 2)\n",
  $chatroom->getMessageCount() // Return 2
);

echo sprintf(
  "Jason's age: %s (Expected: 12)\n",
  $memberSystem->getAgeByEmail("jason@example.com") // Return 12
);