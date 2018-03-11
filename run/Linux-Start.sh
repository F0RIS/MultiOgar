#!/bin/bash

##Function Definition
pause() {
    read -p "Press [Enter] key to exit"
}


cd $(dirname $0) # cd scr dir
if [ ! "$(id -u)" = 0 ] && [ ! -f ".readwarning" ]; then
		echo "WARNING: MultiOgar-Edited uses privileged ports by default, which may" \
		    "cause an error. Please either change the ports in the config" \
		    "file (gameserver.ini) to two different ports above 1024, or run" \
		    "this script as root. This warning will only be shown once, unless" \
		    "the file \".readwarning\" is deleted" 1>&2
	    touch .readwarning
	    sleep 5
fi

#Check which command to execute, nodejs (debian based) or node (others)
#This will give priority to nodejs
command -v nodejs &>/dev/null
if [ $? -eq 0 ]; then
    node ../src/index.js
else
    command -v nodejs &>/dev/null
    
    if [ $? -eq 0 ]; then
        node ../src/index.js
    else
        echo "Couldn't find NodeJS. Please install it and ensure it is in your \$PATH"
    fi
fi

while true
do
 node ../src/index.js
 echo "Restarting server..."
done


# Pause
#pause
