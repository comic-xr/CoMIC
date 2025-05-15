#!/bin/bash
t_start=`date +%s%N | cut -b1-13`
log="loggamelo"
TIMEOUT=10000

# read optional input parameters 
if [ $# -eq 1 ] 
then 
    TIMEOUT=$1
elif [ $# -eq 2 ] 
then 
    TIMEOUT=$1
    log=$2
fi 

# clean log file 
if [ -f $log ] 
then 
    rm $log
fi 

# start logging sockets stats 
counter=0
t_p=0
while [ $t_p -lt $TIMEOUT ]
do 
    t_s=`date +%s%N | cut -b1-13`
    echo "TIME: $t_s" >> $log
    ss -i -t >> $log
    t_now=`date +%s%N | cut -b1-13`
    let "t_p = t_now - t_start"
    let "t_m = t_now - t_s"
    stats[$counter]=$t_m
    let "counter ++"
    #sleep 0.02                     # rate control to avoid too fine granularity
done

# debugging 
#for((i=0; i<counter; i++))
#do
#   echo "$i -- ${stats[$i]}"
#done
#echo "Socket statitstics were logged to: $log" 
