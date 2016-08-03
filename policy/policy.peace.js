/**
 * @fileOverview Screeps module. Abstract object for handling  
 * decisions when at peace.
 * @author Piers Shepperson
 */
"use strict";
var policy = require("policy");
var stats = require("stats");
var policyFrameworks = require("policy.frameworks");
var roomOwned = require("room.owned");
var _ = require('lodash');
var policyBuildspawn = require("policy.buildspawn");
var roleBase = require("role.base");
var poolSupply = require("pool.supply");
var gc = require("gc");
var tasks = require("tasks");
var routeBase = require("route.base");
var npcInvaderBattle = require("npc.invader.battle");

/**
 * Abstract base object for deceison when at peace decisions. Peace is
 * when the main objective is to transfer as much avalible energy to the 
 * rooms contoller as possable.
 * @module policyPeace
 */
var policyPeace = {
    REPAIR_THRESHOLD: 3,
    REPAIR_RATIO: 0.1,
    CONSTRUCTION_THRESHOLD: 100,

    /**
     * Called when at peace. Determins what the new polciy for the comming
     * tick should be.
     * @function draftNewPolicyId
     * @param   {Object} room  The room we are drafting the policy for.
     * @returns {enum} Id of policy for comming tick.
     */
    draftNewPolicyId: function (oldPolicy) {
        var room = Game.rooms[oldPolicy.room];
        if (undefined === room)
            return oldPolicy;

        if (!room.controller.my) {
            return policyFrameworks.createNeutralRoomPolicy(room);
        }

        if (!policyBuildspawn.spawnFound(oldPolicy)) {
            return policyFrameworks.createBuildspawn(room.name);
        }

        var policyRescue = require("policy.rescue");
        if (policyRescue.needsRescue(room)) {
            return policyFrameworks.createRescuePolicy(room.name, oldPolicy);
        }
        return oldPolicy;
    },

    switchPolicy: function (oldPolicy, newPolicy) {
        policy.reassignCreeps(oldPolicy, newPolicy);
    },

    initialisePolicy: function (newPolicy) {
        console.log("in policyPeace initialisePolicy");
        var room = Game.rooms[newPolicy.room];
       // var policyMany2oneLinker = require("policy.many2one.linker");
        // var room = Game.rooms[newPolicy.room];
        //policyMany2oneLinker.initialiseLinks(newPolicy);
        this.connvertToFlexiWorkers(room, newPolicy);
        return true;
    },

    connvertToFlexiWorkers: function (room, currentPolicy) {
        var creeps = _.filter(Game.creeps, function (creep) {
            return (creep.memory.policyId == currentPolicy.id );
        });
        for (var i = 0; i < creeps.length; i++) {
            if (creeps[i].memory.role != gc.ROLE_FLEXI_STORAGE_PORTER
                || creeps[i].memory.role != gc.ROLE_LINKER_SOURCE
                || creeps[i].memory.role != gc.ROLE_LINKER_MINER_STORAGE) {

                roleBase.switchRoles(creeps[i], gc.ROLE_FLEXI_STORAGE_PORTER);
            }
        }
    },

    //checkLinkIntegrety: function (room, policy)

    /**
     * Enact peace time policy. The main objective in peace time is to
     * transger as much source energy to the rooms controller as possible.
     * <ul>
     * <li> Spawn a worker if enought energy avaliable.
     * <li> Determine the ratio of havesters, upgraders, builders and repaiers.
     * <li> Move all the workers in the room.
     * </ul>
     * @function enactPolicy
     * @param   {Object} policy  The room that might need rescuing.
     * @returns {none}
     */
    enactPolicy: function (currentPolicy) {
        //var policyMany2oneLinker = require("policy.many2one.linker");
        var room = Game.rooms[currentPolicy.room];
        console.log("ENACT POLICY PEACE", room);
        poolSupply.updateSupplyLevel(room.name
            , roomOwned.calaculateSuplly(room)
            , room.energyCapacityAvailable);

        economyLinkers = require("economy.linkers");
        //    console.log(room, "energyCapacity",room.energyCapacityAvailable , "Energy in build queue",
        //        routeBase.buildQueueEnergyPerGen(room), "Energy mined", economyLinkers.energyFromLinkersGen(room),
        //        "Average supply journey", roomOwned.avProductionSupplyDistance(room),"Average upgarde distance",
        //        roomOwned.avUpgradeDistance(room));

        routeBase.update(room);
        if (room.name == "W26S21") {
            //   this.initialisePolicy(currentPolicy);
        }
        if (room.name == "W25S23") {
            //this.initialisePolicy(currentPolicy);
        }
        if (room.name == "W25S22") {
            // this.initialisePolicy(currentPolicy);
        }
        var creeps = _.filter(Game.creeps);
        console.log(room, "policy id", currentPolicy.id, "creeps"
            , creeps.length, "room.mode is", room.mode);

        var testNewCode = false;
        // if (room.name == "W25S22" || room.mode != MODE_WORLD) {
        var economyLinkers = require("economy.linkers");
        economyLinkers.attachFlaggedRoutes(room, currentPolicy);
        economyLinkers.attachFlexiStoragePorters(room, currentPolicy);
        economyLinkers.attachRepairer(room, currentPolicy);
        economyLinkers.processBuildQueue(room, currentPolicy);
        // } else  {
        //     if (room.memory.links !== undefined
        //        && room.memory.links.info !== undefined
        //        && room.memory.links.info.length > 0
        // //        && policyMany2oneLinker.readyForMAny2OneLinker(currentPolicy)) {
        //          policyMany2oneLinker.checkLinks(room, currentPolicy);
        //      }
        //       policyMany2oneLinker.checkRepairer(room, currentPolicy);
        //        policyMany2oneLinker.nonLinkBuilds(room, currentPolicy);
        //    }
        if (gc.AI_CONSTRUCTION)
            this.newConstruction(room);
        npcInvaderBattle.defendRoom(room);
    },

    newConstruction: function (room) {
        var spawns = room.find(FIND_MY_SPAWNS);
        var extensions = room.find(FIND_MY_STRUCTURES, {
            filter: {structureType: STRUCTURE_EXTENSION}
        });
        var sites = room.find(FIND_CONSTRUCTION_SITES, {
            filter: {structureType: STRUCTURE_EXTENSION}
        });
        var maxExtensions = CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][room.controller.level];
        //     console.log(room,"builds spawns",spawns,"extensions",extensions.length,
        //                         "max extensions",maxExtensions,"controller level", room.controller.level);
        /* if (extensions.length + sites.length < maxExtensions) {
         var numSites = maxExtensions - extensions.length - sites.length;
         var x = 2, y = 3;
         var range = 2;
         while (numSites--) {
         var perimeter = getPerimeter(range);
         for ( i = 0 ; i < perimeter.length ; i += 2 ) {
         var pos = new RoomPosition( spawns[0].pos.x + perimeter[i].x,
         spawns[0].pos.y + perimeter[i].y    , room.name);
         var result =  room.createConstructionSite(pos, STRUCTURE_EXTENSION);
         if (result == OK)
         numSites--
         }
         }
         }*/
    },

};

module.exports = policyPeace;




































